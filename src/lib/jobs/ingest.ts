import { createClient } from '@/lib/supabase-server';
import type { NormalizedJob } from './parser';
import { deduplicateJobs, fuzzyDeduplicate } from './dedup';
import {
  fetchAllArbeitnowJobs,
  normalizeArbeitnowJob,
} from './source-arbeitnow';
import {
  fetchHimalayasCanadianRelevantJobs,
  normalizeHimalayasJob,
} from './source-himalayas';

export type JobSource = 'job_bank' | 'arbeitnow' | 'himalayas';

export interface IngestionResult {
  source: JobSource;
  fetched: number;
  normalized: number;
  duplicates: number;
  inserted: number;
  errors: string[];
  timestamp: string;
}

/**
 * Store normalized jobs in Supabase
 */
async function storeJobs(
  jobs: NormalizedJob[],
  source: JobSource
): Promise<number> {
  const supabase = await createClient();
  let inserted = 0;

  for (const job of jobs) {
    // Upsert employer first
    const { data: employer, error: employerError } = await supabase
      .from('employers')
      .upsert(
        {
          canonical_name: job.employer_name,
          aliases: [job.employer_name],
          province: job.province || null,
          source,
        },
        {
          onConflict: 'canonical_name',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (employerError) {
      console.error(`Failed to upsert employer "${job.employer_name}":`, employerError);
      continue;
    }

    // Upsert posting
    const { error: postingError } = await supabase
      .from('postings')
      .upsert(
        {
          employer_id: employer.id,
          canonical_fingerprint: job.canonical_fingerprint,
          title: job.title,
          noc_code: job.noc_code || null,
          location: job.location,
          salary_range: job.salary_range || null,
          raw_description: job.raw_description,
          sponsorship_confidence: job.is_lmia ? 0.8 : 0.1,
          status: 'active',
          first_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'canonical_fingerprint',
          ignoreDuplicates: true,
        }
      );

    if (postingError) {
      // Skip duplicate postings
      if (postingError.code === '23505') continue;
      console.error(`Failed to upsert posting for "${job.title}":`, postingError);
      continue;
    }

    inserted++;
  }

  return inserted;
}

/**
 * Ingest jobs from Arbeitnow (German job board)
 */
export async function ingestArbeitnow(): Promise<IngestionResult> {
  const result: IngestionResult = {
    source: 'arbeitnow',
    fetched: 0,
    normalized: 0,
    duplicates: 0,
    inserted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    const jobs = await fetchAllArbeitnowJobs(3); // First 3 pages
    result.fetched = jobs.length;
    result.normalized = jobs.length;

    // Deduplicate
    const { unique_jobs, stats } = deduplicateJobs(jobs);
    result.duplicates = stats.duplicates;

    // Store in database
    result.inserted = await storeJobs(unique_jobs, 'arbeitnow');
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  return result;
}

/**
 * Ingest jobs from Himalayas (remote job board)
 */
export async function ingestHimalayas(): Promise<IngestionResult> {
  const result: IngestionResult = {
    source: 'himalayas',
    fetched: 0,
    normalized: 0,
    duplicates: 0,
    inserted: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  try {
    const jobs = await fetchHimalayasCanadianRelevantJobs(
      [
        'software engineer',
        'data analyst',
        'product manager',
        'project manager',
        'devops engineer',
        'cloud engineer',
        'machine learning engineer',
        'full stack developer',
        'frontend developer',
        'backend developer',
      ],
      100 // Max per query
    );
    result.fetched = jobs.length;
    result.normalized = jobs.length;

    // Deduplicate
    const { unique_jobs, stats } = deduplicateJobs(jobs);
    result.duplicates = stats.duplicates;

    // Store in database
    result.inserted = await storeJobs(unique_jobs, 'himalayas');
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  return result;
}

/**
 * Ingest from all sources
 */
export async function ingestAll(): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  // Run ingestion in parallel with error isolation
  const [arbeitnowResult, himalayasResult] = await Promise.allSettled([
    ingestArbeitnow(),
    ingestHimalayas(),
  ]);

  if (arbeitnowResult.status === 'fulfilled') {
    results.push(arbeitnowResult.value);
  } else {
    results.push({
      source: 'arbeitnow',
      fetched: 0,
      normalized: 0,
      duplicates: 0,
      inserted: 0,
      errors: [
        arbeitnowResult.reason instanceof Error
          ? arbeitnowResult.reason.message
          : 'Unknown error',
      ],
      timestamp: new Date().toISOString(),
    });
  }

  if (himalayasResult.status === 'fulfilled') {
    results.push(himalayasResult.value);
  } else {
    results.push({
      source: 'himalayas',
      fetched: 0,
      normalized: 0,
      duplicates: 0,
      inserted: 0,
      errors: [
        himalayasResult.reason instanceof Error
          ? himalayasResult.reason.message
          : 'Unknown error',
      ],
      timestamp: new Date().toISOString(),
    });
  }

  return results;
}
