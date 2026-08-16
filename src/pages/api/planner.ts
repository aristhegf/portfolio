import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { Redis } from '@upstash/redis';

/**
 * Planner form endpoint — the "real backend" for the request form.
 *
 * Accepts multipart/form-data (fields + an optional file). The file is
 * uploaded to Sanity as an asset, linked to the submission document, and
 * attached to the owner's notification email. Spam defenses: a honeypot
 * field (bots fill it, humans can't see it — we answer with a fake success
 * so bots never learn) and per-IP rate limiting in module memory. Missing
 * env config degrades gracefully: no write token → 501 (the form falls
 * back to mailto), no Resend key → the submission is still saved.
 *
 * Rate limiting uses Vercel KV (via @upstash/redis, which reads the
 * KV_REST_API_URL / KV_REST_API_TOKEN environment variables Vercel
 * injects) so the cap is GLOBAL across serverless instances. When KV
 * isn't configured (e.g. local dev), it degrades to per-instance module
 * memory — still useful, just not global.
 */

const projectId = import.meta.env.SANITY_PROJECT_ID as string | undefined;
const dataset = (import.meta.env.SANITY_DATASET || 'production') as string;
const writeToken = import.meta.env.SANITY_API_WRITE_TOKEN as string | undefined;

// Vercel serverless bodies cap around 4.5 MB, so keep uploads well under.
const MAX_FILE_BYTES = 4 * 1024 * 1024;

const resendKey = import.meta.env.RESEND_API_KEY as string | undefined;
const notifyTo = import.meta.env.CONTACT_NOTIFY_EMAIL as string | undefined;
const notifyFrom = (import.meta.env.CONTACT_NOTIFY_FROM as string | undefined) || 'Portfolio <onboarding@resend.dev>';

/* ---- Rate limiting (Vercel KV global, in-memory fallback) ---- */
const RATE_WINDOW_SEC = 15 * 60; // 15 minutes
const RATE_MAX = 3; // submissions per window per IP

const kvUrl = import.meta.env.KV_REST_API_URL as string | undefined;
const kvToken = import.meta.env.KV_REST_API_TOKEN as string | undefined;
const kv = kvUrl && kvToken ? new Redis({ url: kvUrl, token: kvToken }) : null;

// Fallback limiter used only when KV is not configured.
const memoryHits = new Map<string, { count: number; windowStart: number }>();

async function isRateLimited(ip: string): Promise<boolean> {
  if (kv) {
    try {
      const key = `planner:rl:${ip}`;
      const count = await kv.incr(key);
      if (count === 1) await kv.expire(key, RATE_WINDOW_SEC);
      return count > RATE_MAX;
    } catch (err) {
      console.warn('[planner] KV rate limit unavailable — falling back to memory:', err);
    }
  }

  const now = Date.now();
  const entry = memoryHits.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_SEC * 1000) {
    memoryHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

// Keep the memory map from growing forever — prune stale windows when large.
function pruneHits() {
  if (memoryHits.size < 500) return;
  const now = Date.now();
  for (const [ip, entry] of memoryHits) {
    if (now - entry.windowStart > RATE_WINDOW_SEC * 1000) memoryHits.delete(ip);
  }
}

const clientIp = (request: Request) =>
  (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
  request.headers.get('x-real-ip') ||
  'unknown';

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export const POST: APIRoute = async ({ request }) => {
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (!projectId || !writeToken) {
    return json(501, { error: 'Form backend is not configured yet.' });
  }

  pruneHits();
  if (await isRateLimited(clientIp(request))) {
    return json(429, { error: 'Too many submissions — try again later.' });
  }

  /* Parse multipart (browser) or JSON (API clients) bodies. */
  const contentType = request.headers.get('content-type') || '';
  let type = '';
  let budget = '';
  let timeline = '';
  let task = '';
  let name = '';
  let contact = '';
  let company = '';
  let phone = '';
  let website = ''; // honeypot — bots fill it, humans never see it
  let file: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    let fd: FormData;
    try {
      fd = await request.formData();
    } catch {
      return json(400, { error: 'Invalid request body.' });
    }
    type = str(fd.get('type'), 80);
    budget = str(fd.get('budget'), 80);
    timeline = str(fd.get('timeline'), 80);
    task = str(fd.get('task'), 5000);
    name = str(fd.get('name'), 120);
    contact = str(fd.get('contact'), 200);
    company = str(fd.get('company'), 200);
    phone = str(fd.get('phone'), 40);
    website = str(fd.get('website'), 500);
    const f = fd.get('file');
    if (f instanceof File) file = f;
  } else {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: 'Invalid request body.' });
    }
    const data = payload as Record<string, unknown>;
    type = str(data.type, 80);
    budget = str(data.budget, 80);
    timeline = str(data.timeline, 80);
    task = str(data.task, 5000);
    name = str(data.name, 120);
    contact = str(data.contact, 200);
    company = str(data.company, 200);
    phone = str(data.phone, 40);
    website = str(data.website, 500);
  }

  /* Honeypot tripped — pretend success so the bot keeps its head down. */
  if (website) {
    return json(200, { ok: true, id: 'discarded' });
  }

  // Same required fields the client enforces — never trust the client alone.
  if (!task || !name || !contact) {
    return json(400, { error: 'task, name and contact are required.' });
  }

  if (file && file.size > MAX_FILE_BYTES) {
    return json(413, { error: 'The attached file is too large (max 4 MB).' });
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token: writeToken,
    useCdn: false,
  });

  try {
    /* Upload the attached file to Sanity, keep the bytes for the email. */
    let fileAsset: { _type: 'file'; asset: { _ref: string } } | undefined;
    let assetUrl = '';
    let attachment: { filename: string; content: string } | undefined;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await client.assets.upload('file', buffer, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      });
      fileAsset = { _type: 'file', asset: { _ref: uploaded._id } };
      assetUrl = uploaded.url;
      attachment = { filename: file.name, content: buffer.toString('base64') };
    }

    const doc = await client.create({
      _type: 'submission',
      projectType: type || '—',
      budget: budget || '—',
      timeline: timeline || '—',
      task,
      name,
      contact,
      company,
      phone,
      fileName: file?.name || '',
      ...(fileAsset ? { fileAsset } : {}),
    });

    /* Email the owner — best-effort, never fails the request. */
    if (resendKey && notifyTo) {
      try {
        const studioLink = `${request.url.startsWith('http') ? new URL(request.url).origin : ''}/studio`;
        const text = [
          `New project inquiry — ${name}`,
          '',
          `Project type: ${type || '—'}`,
          `Budget: ${budget || '—'}`,
          `Timeline: ${timeline || '—'}`,
          `Company: ${company || '—'}`,
          `Phone: ${phone || '—'}`,
          '',
          `Task:`,
          task,
          '',
          `Name: ${name}`,
          `Contact: ${contact}`,
          file?.name ? `Attachment: ${file.name}${assetUrl ? ` (${assetUrl})` : ''}` : '',
          studioLink ? `View in Studio: ${studioLink}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: notifyFrom,
            to: [notifyTo],
            subject: `New project inquiry — ${name}`,
            text,
            ...(attachment ? { attachments: [attachment] } : {}),
          }),
        });
      } catch (err) {
        console.error('[planner] notification email failed:', err);
      }
    } else if (!resendKey || !notifyTo) {
      console.warn(
        '[planner] RESEND_API_KEY / CONTACT_NOTIFY_EMAIL not set — submission saved without email notification.',
      );
    }

    return json(200, { ok: true, id: doc._id });
  } catch (err) {
    console.error('[planner] failed to save submission:', err);
    return json(500, { error: 'Could not save the submission.' });
  }
};
