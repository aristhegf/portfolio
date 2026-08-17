import { defineMiddleware } from 'astro:middleware';

const STUDIO_PREFIX = '/studio';
const COOKIE_NAME = 'studio_auth';
const SESSION_DAYS = 30;

// Constant-time comparison so the auth check doesn't leak timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Token = SHA-256 of the password. The cookie carries only the digest, never
// the password itself, and a wrong guess never matches.
async function tokenFor(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function loginPage(showError: boolean): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Studio access</title>
    <style>
      :root { --bg: #0b0b0d; --ink: #f2f1ed; --ink-2: #9b9b93; --accent: #f07077; --line: rgba(242,241,237,.12); }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: var(--bg); color: var(--ink); font-family: 'IBM Plex Mono', ui-monospace, monospace; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      form { width: min(340px, 100%); }
      .label { display: inline-flex; align-items: center; gap: 10px; font-size: .78rem; letter-spacing: .18em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 1.6rem; }
      .label span { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
      input { width: 100%; background: transparent; border: 0; border-bottom: 1px solid var(--line); color: var(--ink); font: inherit; font-size: 1.05rem; padding: .7rem 0; outline: none; }
      input:focus { border-bottom-color: var(--accent); }
      button { margin-top: 1.8rem; width: 100%; border: 1px solid var(--ink); background: var(--ink); color: var(--bg); font: inherit; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; padding: .95em 1.6em; cursor: pointer; }
      button:hover { opacity: .88; }
      .error { margin-top: 1rem; font-size: .74rem; letter-spacing: .08em; color: var(--accent); }
      .error[hidden] { display: none; }
    </style>
  </head>
  <body>
    <form method="post" action="/studio">
      <p class="label"><span aria-hidden="true"></span>Studio</p>
      <label class="sr-only" for="password">Password</label>
      <input id="password" name="password" type="password" placeholder="Password" autocomplete="current-password" autofocus />
      <button type="submit">Unlock</button>
      <p class="error" ${showError ? '' : 'hidden'}>Wrong password.</p>
    </form>
  </body>
</html>`;
  return new Response(html, {
    status: showError ? 401 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, redirect } = context;
  const url = new URL(request.url);
  const isStudio =
    url.pathname === STUDIO_PREFIX || url.pathname.startsWith(`${STUDIO_PREFIX}/`);

  // Everything outside /studio flows straight through.
  if (!isStudio) return next();

  // If no password is configured the studio is unreachable in production
  // (fail closed) but still usable in local dev.
  const password = import.meta.env.STUDIO_PASSWORD ?? '';
  if (!password) {
    if (import.meta.env.DEV) return next();
    return new Response('Studio access is not configured.', { status: 503 });
  }

  const expected = await tokenFor(password);

  // Already authenticated? Pass through.
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (match && safeEqual(match.slice(COOKIE_NAME.length + 1), expected)) {
    return next();
  }

  // Login attempt: verify the password and issue a session cookie.
  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const attempt = String(form?.get('password') ?? '');
    if (attempt && safeEqual(await tokenFor(attempt), expected)) {
      const cookieValue = `${COOKIE_NAME}=${expected}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${import.meta.env.PROD ? '; Secure' : ''}`;
      return new Response(null, {
        status: 302,
        headers: { Location: STUDIO_PREFIX, 'Set-Cookie': cookieValue },
      });
    }
    return loginPage(true);
  }

  return loginPage(false);
});
