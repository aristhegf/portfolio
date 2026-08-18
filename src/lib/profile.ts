import { createClient } from '@/lib/supabase-server';
import type { Profile, ImmigrationProfile } from '@/types/database';

/**
 * Get or create user profile
 */
export async function getOrCreateProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  // Try to get existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) return existing;

  // Create new profile
  const { data: newProfile } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      full_name: null,
      target_industries: [],
      target_provinces: [],
      noc_targets: [],
    })
    .select()
    .single();

  return newProfile;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'target_industries' | 'target_provinces' | 'noc_targets'>>
): Promise<{ error: Error | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        ...updates,
      },
      {
        onConflict: 'user_id',
      }
    );

  return { error };
}

/**
 * Get immigration profile
 */
export async function getImmigrationProfile(userId: string): Promise<ImmigrationProfile | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('immigration_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data;
}

/**
 * Create or update immigration profile
 */
export async function upsertImmigrationProfile(
  userId: string,
  profile: Partial<Omit<ImmigrationProfile, 'id' | 'user_id' | 'created_at'>>
): Promise<{ error: Error | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('immigration_profiles')
    .upsert(
      {
        user_id: userId,
        ...profile,
      },
      {
        onConflict: 'user_id',
      }
    );

  return { error };
}

/**
 * IELTS score types
 */
export interface IELTSScores {
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  overall: number;
}

/**
 * Language test types
 */
export type LanguageTestType = 'IELTS' | 'CELPIP' | 'TEF' | 'TCF';

/**
 * Calculate IELTS CLB equivalent
 */
export function ieltsToCLB(ieltsBand: number): number {
  if (ieltsBand >= 8.0) return 10;
  if (ieltsBand >= 7.5) return 9;
  if (ieltsBand >= 7.0) return 8;
  if (ieltsBand >= 6.5) return 7;
  if (ieltsBand >= 6.0) return 6;
  if (ieltsBand >= 5.5) return 5;
  if (ieltsBand >= 5.0) return 4;
  return 0;
}

/**
 * Format language scores for display
 */
export function formatLanguageScores(
  testType: LanguageTestType,
  scores: Record<string, number>
): string {
  if (testType === 'IELTS') {
    const s = scores as unknown as IELTSScores;
    return `L:${s.listening} R:${s.reading} W:${s.writing} S:${s.speaking} (Overall: ${s.overall})`;
  }
  // For other tests, just show key-value pairs
  return Object.entries(scores)
    .map(([key, val]) => `${key}: ${val}`)
    .join(', ');
}
