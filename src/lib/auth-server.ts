import { createClient } from '@/lib/supabase-server';

/**
 * Get current session on the server
 */
export async function getServerSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Get current user on the server
 */
export async function getServerUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

/**
 * Check if user is authenticated (redirects to /auth if not)
 */
export async function requireAuth(locals?: { user?: { id: string } }) {
  // If Astro.locals has user (from middleware), use that
  if (locals?.user) {
    return locals.user;
  }

  const { user, error } = await getServerUser();
  if (error || !user) {
    return null;
  }
  return user;
}
