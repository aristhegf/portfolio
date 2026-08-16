import type { APIRoute } from 'astro';

/**
 * Dynamic robots.txt. Kept as an endpoint (like sitemap.xml) so the Sitemap
 * directive is always an absolute URL derived from the configured site, never
 * a hardcoded domain. The admin studio is disallowed — it's also left out of
 * the sitemap.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? url.origin;
  const sitemapUrl = new URL('/sitemap.xml', base).href;

  const body = `User-agent: *
Allow: /
Disallow: /studio

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
