import type { NormalizedJob } from './parser';

export interface DeduplicationResult {
  unique_jobs: NormalizedJob[];
  duplicates: {
    job: NormalizedJob;
    duplicate_of: string;
    reason: string;
  }[];
  stats: {
    total: number;
    unique: number;
    duplicates: number;
  };
}

/**
 * Deduplicate jobs based on canonical fingerprint
 */
export function deduplicateJobs(jobs: NormalizedJob[]): DeduplicationResult {
  const fingerprintMap = new Map<string, NormalizedJob>();
  const duplicates: DeduplicationResult['duplicates'] = [];

  for (const job of jobs) {
    const existing = fingerprintMap.get(job.canonical_fingerprint);

    if (existing) {
      duplicates.push({
        job,
        duplicate_of: existing.canonical_fingerprint,
        reason: 'Exact fingerprint match',
      });
    } else {
      fingerprintMap.set(job.canonical_fingerprint, job);
    }
  }

  const unique_jobs = Array.from(fingerprintMap.values());

  return {
    unique_jobs,
    duplicates,
    stats: {
      total: jobs.length,
      unique: unique_jobs.length,
      duplicates: duplicates.length,
    },
  };
}

/**
 * Fuzzy deduplication for near-duplicates (same employer, slightly different title)
 * This is more aggressive and should be used after exact deduplication
 */
export function fuzzyDeduplicate(
  jobs: NormalizedJob[],
  threshold: number = 0.85
): DeduplicationResult {
  const fingerprintMap = new Map<string, NormalizedJob>();
  const duplicates: DeduplicationResult['duplicates'] = [];

  for (const job of jobs) {
    // First try exact match
    if (fingerprintMap.has(job.canonical_fingerprint)) {
      duplicates.push({
        job,
        duplicate_of: job.canonical_fingerprint,
        reason: 'Exact fingerprint match',
      });
      continue;
    }

    // Then try fuzzy match on employer name
    const jobEmployer = job.employer_name.toLowerCase().trim();
    let isFuzzyDuplicate = false;

    for (const [fingerprint, existingJob] of fingerprintMap) {
      const existingEmployer = existingJob.employer_name.toLowerCase().trim();

      // Check if employer names are very similar
      if (jobEmployer === existingEmployer) {
        // Same employer, check if titles are similar
        const jobTitle = job.title.toLowerCase();
        const existingTitle = existingJob.title.toLowerCase();

        // Simple similarity: check if one contains the other or they share significant words
        if (
          jobTitle.includes(existingTitle) ||
          existingTitle.includes(jobTitle) ||
          calculateWordOverlap(jobTitle, existingTitle) > threshold
        ) {
          isFuzzyDuplicate = true;
          duplicates.push({
            job,
            duplicate_of: fingerprint,
            reason: `Fuzzy match: same employer (${job.employer_name}), similar title`,
          });
          break;
        }
      }
    }

    if (!isFuzzyDuplicate) {
      fingerprintMap.set(job.canonical_fingerprint, job);
    }
  }

  const unique_jobs = Array.from(fingerprintMap.values());

  return {
    unique_jobs,
    duplicates,
    stats: {
      total: jobs.length,
      unique: unique_jobs.length,
      duplicates: duplicates.length,
    },
  };
}

/**
 * Calculate word overlap between two strings
 */
function calculateWordOverlap(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(str2.split(/\s+/).filter((w) => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      overlap++;
    }
  }

  const smaller = Math.min(words1.size, words2.size);
  return smaller > 0 ? overlap / smaller : 0;
}
