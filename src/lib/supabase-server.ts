import { createServerClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export async function createClient(cookies?: AstroCookies) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (!cookies) return [];
          // Astro doesn't have getAll() — parse from request headers
          const all: { name: string; value: string }[] = [];
          // Iterate common cookie names or parse raw header
          // We use a trick: get the raw cookie string from Astro
          // by checking each cookie we know about
          try {
            // Access cookies through the raw string approach
            const raw = (cookies as unknown as { request?: { headers?: Headers } })
              ?.request?.headers?.get?.('cookie') ?? '';
            if (raw) {
              for (const part of raw.split(';')) {
                const eqIdx = part.indexOf('=');
                if (eqIdx > 0) {
                  all.push({
                    name: part.slice(0, eqIdx).trim(),
                    value: part.slice(eqIdx + 1).trim(),
                  });
                }
              }
            }
          } catch {
            // fallback: empty
          }
          return all;
        },
        setAll(cookiesToSet) {
          if (!cookies) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookies.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    }
  );
}
