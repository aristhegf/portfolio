import type { APIRoute } from 'astro';
import { getProjects } from '../lib/sanity';

/**
 * Dynamic sitemap for an all-SSR site. The build-time @astrojs/sitemap
 * integration can't emit entries for on-demand routes, so this endpoint
 * generates the XML per request from the routes plus the live project slugs —
 * new projects appear here automatically, no redeploy needed.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? url.origin;
  const projects = await getProjects();

  const paths = [
    '/',
    '/work',
    '/writing',
    '/about',
    // The Sanity admin studio is deliberately not listed.
    ...projects.map((p) => `/work/${p.slug.current}`),
  ];

  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, base).href}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Short cache: the sitemap changes whenever Sanity content does.
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
