import type { NormalizedJob } from './parser';
import { generateFingerprint } from './parser';

/**
 * Himalayas API response types
 * @see https://himalayas.app/jobs/api/search
 */
interface HimalayasJob {
  title: string;
  excerpt: string;
  companyName: string;
  companySlug: string;
  companyLogo: string;
  employmentType: string;
  minSalary: number | null;
  maxSalary: number | null;
  salaryPeriod: string;
  seniority: string[];
  currency: string;
  locationRestrictions: string[];
  timezoneRestrictions: number[];
  categories: string[];
  parentCategories: string[];
  description: string; // HTML
  pubDate: number; // Unix timestamp
  expiryDate: number;
  applicationLink: string;
  guid: string;
}

interface HimalayasResponse {
  comments?: string;
  updatedAt: number;
  offset: number;
  limit: number;
  totalCount: number;
  jobs: HimalayasJob[];
}

const HIMALAYAS_API_BASE = 'https://himalayas.app/jobs/api/search';

/**
 * Fetch jobs from Himalayas API with pagination
 */
export async function fetchHimalayasJobs(
  query: string = '',
  limit: number = 50,
  offset: number = 0
): Promise<HimalayasResponse> {
  const url = new URL(HIMALAYAS_API_BASE);

  if (query) {
    url.searchParams.set('q', query);
  }
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Himalayas API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Strip HTML tags from description and extract plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format salary range from min/max/currency/period
 */
function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string,
  period: string
): string {
  if (!min && !max) return '';

  const formatAmount = (amount: number) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  if (min && max) {
    return `${formatAmount(min)} - ${formatAmount(max)} / ${period}`;
  }
  if (min) {
    return `${formatAmount(min)}+ / ${period}`;
  }
  return `Up to ${formatAmount(max!)} / ${period}`;
}

/**
 * Determine if a job allows Canadian timezone applicants
 */
function isAccessibleFromCanada(
  timezoneRestrictions: number[],
  locationRestrictions: string[]
): boolean {
  // Canada spans roughly UTC-3.5 to UTC-8
  // Check if any Canadian timezone offsets are allowed
  const canadianTimezones = [-3.5, -4, -5, -6, -7, -8];

  // If no timezone restrictions, assume accessible
  if (!timezoneRestrictions || timezoneRestrictions.length === 0) {
    return true;
  }

  // Check if any Canadian timezone falls within allowed ranges
  const hasCanadianTimezone = canadianTimezones.some((tz) =>
    timezoneRestrictions.includes(tz)
  );

  // Also check if Canada is in location restrictions
  const hasCanadaInLocations = locationRestrictions.some((loc) =>
    loc.toLowerCase().includes('canada')
  );

  // If they specifically list location restrictions and Canada isn't there,
  // but their timezone restrictions include Canadian timezones, still allow
  return hasCanadianTimezone || hasCanadaInLocations;
}

/**
 * Extract country from location restrictions
 */
function extractPrimaryLocation(locationRestrictions: string[]): string {
  if (!locationRestrictions || locationRestrictions.length === 0) {
    return 'Remote (Global)';
  }
  if (locationRestrictions.length <= 3) {
    return locationRestrictions.join(', ');
  }
  return `${locationRestrictions.length} countries`;
}

/**
 * Normalize Himalayas job into our standard format
 */
export function normalizeHimalayasJob(job: HimalayasJob): NormalizedJob {
  const description = stripHtml(job.description);
  const location = extractPrimaryLocation(job.locationRestrictions);
  const salary = formatSalaryRange(
    job.minSalary,
    job.maxSalary,
    job.currency || 'USD',
    job.salaryPeriod || 'annual'
  );

  // Map seniority to province field for display purposes
  // (Canadian immigration doesn't directly map, but useful for filtering)
  const seniority = job.seniority?.length > 0 ? job.seniority.join(', ') : '';

  return {
    employer_name: job.companyName || 'Unknown Company',
    title: job.title || 'Untitled Position',
    location,
    province: seniority, // Using province field to store seniority for international jobs
    noc_code: '', // Himalayas doesn't provide NOC codes
    salary_range: salary,
    raw_description: description,
    source_url: job.applicationLink || job.guid,
    source_external_id: job.guid || generateFingerprint(
      job.companyName,
      job.title,
      location
    ),
    is_lmia: false, // These are remote jobs, not LMIA-processed
    is_international: true,
    canonical_fingerprint: generateFingerprint(
      job.companyName,
      job.title,
      location
    ),
  };
}

/**
 * Fetch multiple pages of Himalayas jobs for specific search queries
 * Targets Canadian immigration-relevant roles
 */
export async function fetchHimalayasCanadianRelevantJobs(
  queries: string[] = [
    'software engineer',
    'data analyst',
    'product manager',
    'project manager',
    'devops engineer',
    'cloud engineer',
    'machine learning',
    'full stack developer',
  ],
  maxPerQuery: number = 50
): Promise<NormalizedJob[]> {
  const allJobs: NormalizedJob[] = [];
  const seenGuids = new Set<string>();

  for (const query of queries) {
    let offset = 0;
    let hasMore = true;

    while (hasMore && offset < maxPerQuery) {
      const response = await fetchHimalayasJobs(query, 50, offset);

      for (const job of response.jobs) {
        // Deduplicate by guid
        if (!seenGuids.has(job.guid)) {
          seenGuids.add(job.guid);

          // Only include jobs accessible from Canada
          if (isAccessibleFromCanada(job.timezoneRestrictions, job.locationRestrictions)) {
            allJobs.push(normalizeHimalayasJob(job));
          }
        }
      }

      offset += 50;
      hasMore = offset < response.totalCount && offset < maxPerQuery;

      // Small delay to be respectful
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  return allJobs;
}

/**
 * Extract categories from Himalayas job for filtering
 */
export function extractHimalayasTags(job: HimalayasJob): string[] {
  const tags: string[] = [];

  if (job.parentCategories) {
    tags.push(...job.parentCategories);
  }

  if (job.seniority) {
    tags.push(...job.seniority);
  }

  if (job.employmentType) {
    tags.push(job.employmentType);
  }

  return tags;
}
