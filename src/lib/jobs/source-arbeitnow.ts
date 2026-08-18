import type { NormalizedJob } from './parser';
import { generateFingerprint } from './parser';

/**
 * Arbeitnow API response types
 * @see https://www.arbeitnow.com/api/job-board-api
 */
interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string; // HTML
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number; // Unix timestamp
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const ARBEITNOW_API_BASE = 'https://www.arbeitnow.com/api/job-board-api';

/**
 * Fetch jobs from Arbeitnow API with pagination
 */
export async function fetchArbeitnowJobs(
  page: number = 1,
  perPage: number = 100
): Promise<ArbeitnowResponse> {
  const url = new URL(ARBEITNOW_API_BASE);
  url.searchParams.set('page', String(page));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Arbeitnow API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Strip HTML tags from description and extract plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ') // Remove all HTML tags
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
 * Extract salary range from job description text (best-effort)
 * Arbeitnow doesn't provide structured salary data, so we parse it from description
 */
function extractSalaryFromDescription(description: string): string {
  const plainText = stripHtml(description);

  // Common salary patterns in German job postings
  const salaryPatterns = [
    // €50,000 - €70,000
    /(?:€|EUR)\s*([\d.,]+)\s*[-–]\s*(?:€|EUR)\s*([\d.,]+)/i,
    // 50.000 - 70.000 €
    /([\d.,]+)\s*[-–]\s*([\d.,]+)\s*(?:€|EUR)/i,
    // salary: €50k - €70k
    /(?:salary|gehalt|vergütung)[:\s]*(?:€|EUR)?\s*([\d.,]+k?)\s*[-–]\s*(?:€|EUR)?\s*([\d.,]+k?)/i,
  ];

  for (const pattern of salaryPatterns) {
    const match = plainText.match(pattern);
    if (match) {
      return `${match[0].trim()}`;
    }
  }

  return '';
}

/**
 * Determine province/state from location string
 * For German jobs, we map to Bundesländer
 */
function mapLocationToProvince(location: string): string {
  const normalizedLocation = location.toLowerCase().trim();

  // Map common German cities to their states
  const cityToState: Record<string, string> = {
    berlin: 'Berlin',
    hamburg: 'Hamburg',
    munich: 'Bayern',
    münchen: 'Bayern',
    köln: 'Nordrhein-Westfalen',
    frankfurt: 'Hessen',
    stuttgart: 'Baden-Württemberg',
    düsseldorf: 'Nordrhein-Westfalen',
    leipzig: 'Sachsen',
    dortmund: 'Nordrhein-Westfalen',
    essen: 'Nordrhein-Westfalen',
    bremen: 'Bremen',
    dresden: 'Sachsen',
    hannover: 'Niedersachsen',
    nürnberg: 'Bayern',
    duisburg: 'Nordrhein-Westfalen',
    bochum: 'Nordrhein-Westfalen',
    wuppertal: 'Nordrhein-Westfalen',
    bielefeld: 'Nordrhein-Westfalen',
    bonn: 'Nordrhein-Westfalen',
    mannheim: 'Baden-Württemberg',
    karlsruhe: 'Baden-Württemberg',
    augsburg: 'Bayern',
    wiesbaden: 'Hessen',
    mönchengladbach: 'Nordrhein-Westfalen',
    gelsenkirchen: 'Nordrhein-Westfalen',
    aachen: 'Nordrhein-Westfalen',
    braunschweig: 'Niedersachsen',
    kiel: 'Schleswig-Holstein',
    chemnitz: 'Sachsen',
    halle: 'Sachsen-Anhalt',
    magdeburg: 'Sachsen-Anhalt',
    freiburg: 'Baden-Württemberg',
    krefeld: 'Nordrhein-Westfalen',
    mainz: 'Rheinland-Pfalz',
    erfurt: 'Thüringen',
    kassel: 'Hessen',
    saarbrücken: 'Saarland',
    hameln: 'Niedersachsen',
    rostock: 'Mecklenburg-Vorpommern',
    kaiserslautern: 'Rheinland-Pfalz',
    oberhausen: 'Nordrhein-Westfalen',
    darmstadt: 'Hessen',
    heidelberg: 'Baden-Württemberg',
    paderborn: 'Nordrhein-Westfalen',
    potsdam: 'Brandenburg',
    ingolstadt: 'Bayern',
    würzburg: 'Bayern',
    ulm: 'Baden-Württemberg',
    heilbronn: 'Baden-Württemberg',
    offenbach: 'Hessen',
    fürth: 'Bayern',
    osnabrück: 'Niedersachsen',
    ludwigshafen: 'Rheinland-Pfalz',
    oldenburg: 'Niedersachsen',
    münster: 'Nordrhein-Westfalen',
    tübingen: 'Baden-Württemberg',
    greifswald: 'Mecklenburg-Vorpommern',
  };

  for (const [city, state] of Object.entries(cityToState)) {
    if (normalizedLocation.includes(city)) {
      return state;
    }
  }

  // If it's remote, return empty
  if (normalizedLocation.includes('remote')) {
    return '';
  }

  return location || '';
}

/**
 * Normalize Arbeitnow job into our standard format
 */
export function normalizeArbeitnowJob(job: ArbeitnowJob): NormalizedJob {
  const description = stripHtml(job.description);
  const location = job.remote ? 'Remote' : job.location || 'Germany';
  const province = job.remote ? '' : mapLocationToProvince(job.location);

  return {
    employer_name: job.company_name || 'Unknown Company',
    title: job.title || 'Untitled Position',
    location,
    province,
    noc_code: '', // Arbeitnow doesn't provide NOC codes
    salary_range: extractSalaryFromDescription(job.description),
    raw_description: description,
    source_url: job.url || `https://www.arbeitnow.com/jobs/${job.slug}`,
    source_external_id: job.slug || generateFingerprint(
      job.company_name,
      job.title,
      location
    ),
    is_lmia: false, // German jobs won't have Canadian LMIA
    is_international: true, // All Arbeitnow jobs are international
    canonical_fingerprint: generateFingerprint(
      job.company_name,
      job.title,
      location
    ),
  };
}

/**
 * Fetch all pages of Arbeitnow jobs and return normalized results
 * Respects API rate limits with small delays between requests
 */
export async function fetchAllArbeitnowJobs(
  maxPages: number = 5
): Promise<NormalizedJob[]> {
  const allJobs: NormalizedJob[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    const response = await fetchArbeitnowJobs(page);
    const normalized = response.data.map(normalizeArbeitnowJob);
    allJobs.push(...normalized);

    hasMore = page < response.meta.last_page;
    page++;

    // Small delay to be respectful to the API
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return allJobs;
}

/**
 * Extract tags/categories from Arbeitnow job for filtering
 */
export function extractArbeitnowTags(job: ArbeitnowJob): string[] {
  const tags: string[] = [];

  // Add explicit tags
  if (job.tags) {
    tags.push(...job.tags);
  }

  // Add job types
  if (job.job_types) {
    tags.push(...job.job_types);
  }

  // Add remote tag if applicable
  if (job.remote) {
    tags.push('Remote');
  }

  return tags;
}
