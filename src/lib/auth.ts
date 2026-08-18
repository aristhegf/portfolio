import { createClient } from '@/lib/supabase';

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Get current user
 */
export async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: { user: { id: string; email?: string } } | null) => void
) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange(callback);
}
