import { createClient } from '@/lib/supabase-server';
import type { Job, JobStatus } from '@/types/database';

export interface JobPayload {
  [key: string]: unknown;
}

export interface JobHandler {
  (payload: JobPayload): Promise<void>;
}

// Registry of job handlers
const jobHandlers = new Map<string, JobHandler>();

/**
 * Register a job handler for a specific job type
 */
export function registerJobHandler(type: string, handler: JobHandler) {
  jobHandlers.set(type, handler);
}

/**
 * Create a new job in the queue
 */
export async function createJob(
  type: string,
  payload: JobPayload,
  runAt?: Date
): Promise<Job> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      type,
      payload,
      status: 'pending',
      attempts: 0,
      run_at: runAt?.toISOString() || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Process the next pending job
 */
export async function processNextJob(): Promise<boolean> {
  const supabase = await createClient();

  // Get the next pending job
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString())
    .order('run_at', { ascending: true })
    .limit(1)
    .single();

  if (fetchError || !job) return false;

  // Mark as running
  await supabase
    .from('jobs')
    .update({
      status: 'running',
      attempts: job.attempts + 1,
    })
    .eq('id', job.id);

  try {
    const handler = jobHandlers.get(job.type);
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.type}`);
    }

    await handler(job.payload);

    // Mark as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Mark as failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: errorMessage,
      })
      .eq('id', job.id);

    console.error(`Job ${job.id} failed:`, error);
    return false;
  }
}

/**
 * Process all pending jobs (called by cron)
 */
export async function processAllJobs(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  // Process up to 10 jobs per cron run
  for (let i = 0; i < 10; i++) {
    const success = await processNextJob();
    if (success) {
      processed++;
    } else {
      break;
    }
  }

  return { processed, failed };
}

/**
 * Clean up old completed/failed jobs (older than 7 days)
 */
export async function cleanupOldJobs(): Promise<number> {
  const supabase = await createClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('jobs')
    .delete()
    .in('status', ['completed', 'failed'])
    .lt('created_at', sevenDaysAgo.toISOString())
    .select();

  if (error) throw error;
  return data?.length || 0;
}
