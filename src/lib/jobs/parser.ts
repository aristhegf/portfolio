import { parse } from 'csv-parse/sync';

export interface JobBankRecord {
  job_id: string;
  title: string;
  employer: string;
  location: string;
  province: string;
  noc_code: string;
  salary_range: string;
  date_posted: string;
  description: string;
  job_bank_url: string;
  is_lmia: boolean;
  is_international: boolean;
}

export interface NormalizedJob {
  employer_name: string;
  title: string;
  location: string;
  province: string;
  noc_code: string;
  salary_range: string;
  raw_description: string;
  source_url: string;
  source_external_id: string;
  is_lmia: boolean;
  is_international: boolean;
  canonical_fingerprint: string;
}

/**
 * Generate a canonical fingerprint for deduplication
 * Format: employer|normalized_title|location
 */
export function generateFingerprint(
  employer: string,
  title: string,
  location: string
): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, '') // remove special chars
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim();

  return `${normalize(employer)}|${normalize(title)}|${normalize(location)}`;
}

/**
 * Parse a Job Bank CSV file and return normalized records
 */
export function parseJobBankCSV(csvContent: string): NormalizedJob[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: Record<string, string>) => {
    // Job Bank CSV has specific column names
    const employer = record['Employer name'] || record['employer'] || '';
    const title = record['Job title'] || record['title'] || '';
    const location = record['Location'] || record['location'] || '';
    const province = record['Province'] || record['province'] || '';
    const nocCode = record['NOC'] || record['noc_code'] || '';
    const salary = record['Salary range'] || record['salary_range'] || '';
    const datePosted = record['Date posted'] || record['date_posted'] || '';
    const description = record['Job description'] || record['description'] || '';
    const jobId = record['Job ID'] || record['job_id'] || '';
    const url = record['Job Bank URL'] || record['job_bank_url'] || '';

    return {
      employer_name: employer,
      title,
      location: `${location}, ${province}`.replace(/^,\s*/, ''),
      province,
      noc_code: nocCode,
      salary_range: salary,
      raw_description: description,
      source_url: url || `https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=${encodeURIComponent(title)}&locationstring=${encodeURIComponent(location)}`,
      source_external_id: jobId || generateFingerprint(employer, title, location),
      is_lmia: false, // Will be cross-referenced with LMIA list
      is_international: false, // Will be determined by cross-referencing
      canonical_fingerprint: generateFingerprint(employer, title, location),
    };
  });
}

/**
 * Parse an LMIA positive employer list
 */
export function parseLMIAList(
  csvContent: string
): Map<string, { lmia_count: number; province: string }> {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const lmiaMap = new Map<string, { lmia_count: number; province: string }>();

  for (const record of records) {
    const employer = record['Employer name'] || record['employer'] || '';
    const count = parseInt(record['LMIA count'] || record['count'] || '1', 10);
    const province = record['Province'] || record['province'] || '';

    const normalizedName = employer.toLowerCase().trim();
    lmiaMap.set(normalizedName, {
      lmia_count: count,
      province,
    });
  }

  return lmiaMap;
}

/**
 * Cross-reference jobs with LMIA data to boost sponsorship confidence
 */
export function crossReferenceLMIA(
  jobs: NormalizedJob[],
  lmiaMap: Map<string, { lmia_count: number; province: string }>
): NormalizedJob[] {
  return jobs.map((job) => {
    const employerKey = job.employer_name.toLowerCase().trim();
    const lmiaData = lmiaMap.get(employerKey);

    if (lmiaData) {
      // Higher LMIA count = higher confidence in sponsorship
      const confidence = Math.min(0.9, 0.5 + lmiaData.lmia_count * 0.1);
      return {
        ...job,
        is_lmia: true,
        canonical_fingerprint: job.canonical_fingerprint,
      };
    }

    return job;
  });
}
