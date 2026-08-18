import { createClient } from '@/lib/supabase';

export interface ProfileData {
  full_name: string | null;
  target_provinces: string[];
  noc_targets: string[];
  avatar_url: string | null;
}

export interface ImmigrationData {
  age: number | null;
  highest_education: string | null;
  education_country: string | null;
  language_test_type: string | null;
  language_scores: Record<string, number>;
  canadian_experience_months: number;
  foreign_experience_months: number;
  arranged_employment: boolean;
  provincial_nomination: boolean;
}

/**
 * Fetch the user's profile from Supabase
 */
export async function fetchProfile(userId: string): Promise<ProfileData | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, target_provinces, noc_targets, avatar_url')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as ProfileData;
}

/**
 * Upsert the user's profile in Supabase
 */
export async function saveProfile(
  userId: string,
  profile: ProfileData
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        full_name: profile.full_name,
        target_provinces: profile.target_provinces,
        noc_targets: profile.noc_targets,
        avatar_url: profile.avatar_url,
      },
      { onConflict: 'user_id' }
    );

  return { error: error?.message ?? null };
}

/**
 * Fetch the user's immigration profile from Supabase
 */
export async function fetchImmigrationProfile(userId: string): Promise<ImmigrationData | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('immigration_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return data as ImmigrationData;
}

/**
 * Upsert the user's immigration profile in Supabase
 */
export async function saveImmigrationProfile(
  userId: string,
  profile: ImmigrationData
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('immigration_profiles')
    .upsert(
      {
        user_id: userId,
        age: profile.age,
        highest_education: profile.highest_education,
        education_country: profile.education_country,
        language_test_type: profile.language_test_type,
        language_scores: profile.language_scores,
        canadian_experience_months: profile.canadian_experience_months,
        foreign_experience_months: profile.foreign_experience_months,
        arranged_employment: profile.arranged_employment,
        provincial_nomination: profile.provincial_nomination,
      },
      { onConflict: 'user_id' }
    );

  return { error: error?.message ?? null };
}

/**
 * Upload avatar to Supabase Storage and return the public URL
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();

  const fileExt = file.name.split('.').pop() ?? 'jpg';
  const filePath = `avatars/${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, error: null };
}

/**
 * Load both profile and immigration profile in parallel
 */
export async function loadFullProfile(userId: string) {
  const [profile, immigration] = await Promise.all([
    fetchProfile(userId),
    fetchImmigrationProfile(userId),
  ]);
  return { profile, immigration };
}
