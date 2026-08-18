import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Clear Supabase auth cookies
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    // Extract project ref from URL
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase/);
    if (match) {
      const projectRef = match[1];
      cookies.delete(`sb-${projectRef}-auth-token`, { path: '/' });
    }
  }

  // Also clear any generic auth cookies
  cookies.delete('supabase-auth-token', { path: '/' });

  return redirect('/auth/login');
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Clear Supabase auth cookies
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase/);
    if (match) {
      const projectRef = match[1];
      cookies.delete(`sb-${projectRef}-auth-token`, { path: '/' });
    }
  }

  cookies.delete('supabase-auth-token', { path: '/' });

  return redirect('/auth/login');
};
