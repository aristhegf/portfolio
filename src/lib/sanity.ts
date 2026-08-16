import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const projectId = import.meta.env.SANITY_PROJECT_ID as string | undefined;
export const dataset = (import.meta.env.SANITY_DATASET || 'production') as string;

export const isConfigured = Boolean(projectId);

/**
 * Draft preview — enabled per environment via PUBLIC_SANITY_VISUAL_EDITING_ENABLED
 * plus a read token. With it on, queries run at `perspective: 'previews'`
 * (published + drafts merged), so unpublished edits render live. Production
 * keeps the flag off, so drafts are never exposed there.
 */
const previewEnabled = import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === 'true';
const readToken = import.meta.env.SANITY_API_READ_TOKEN as string | undefined;

if (previewEnabled && !readToken) {
  console.warn(
    '[portfolio] Draft preview is enabled but SANITY_API_READ_TOKEN is missing — drafts will not render.',
  );
}

/** Shared Sanity client. Public read-only credentials in production. */
export const client = isConfigured
  ? createClient({
      projectId: projectId!,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: !previewEnabled,
      ...(previewEnabled && readToken
        ? { perspective: 'drafts' as const, token: readToken }
        : {}),
      // Stega config: encodes edit-info into query results so the Visual
      // Editing overlays can map rendered text back to editor fields.
      ...(previewEnabled ? { stega: { enabled: true, studioUrl: '/studio' } } : {}),
    })
  : null;

/**
 * Query helper for Visual Editing. When preview is enabled, requests return
 * stega-encoded strings plus a source map, which is what the Overlays UI (see
 * <VisualEditing /> in the Layout) needs to highlight and open editable fields.
 * In production the same query runs without stega, so output stays clean.
 */
async function loadQuery<T>(query: string, params?: Record<string, unknown>): Promise<T> {
  if (!client) throw new Error('Sanity client is not configured');
  const { result } = await client.fetch<T>(query, params ?? {}, {
    filterResponse: false,
    resultSourceMap: previewEnabled ? 'withKeyArraySelector' : false,
    stega: previewEnabled,
  });
  return result;
}

const builder = projectId
  ? imageUrlBuilder({ projectId, dataset })
  : null;

/** True when a Sanity image asset is an animated GIF (its `_ref` ends with `-gif`). */
function isGif(source: unknown): boolean {
  const ref =
    typeof source === 'object' && source !== null
      ? (source as { asset?: { _ref?: unknown } }).asset?._ref
      : undefined;
  return typeof ref === 'string' && ref.endsWith('-gif');
}

/** Build a responsive CDN image URL from a Sanity image field. */
export function urlFor(source: unknown, width = 900): string | undefined {
  if (!builder || !source) return undefined;
  let image = builder.image(source as never).width(width).fit('max');
  // Keep GIFs animated — auto-format would convert them to a static frame.
  if (!isGif(source)) {
    image = image.auto('format');
  }
  return image.url();
}

export type Category = {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  order?: number;
};

export type Project = {
  _id: string;
  title: string;
  slug: { current: string };
  year?: number;
  role?: string;
  excerpt?: string;
  tags?: string[];
  featured?: boolean;
  order?: number;
  coverImage?: unknown;
  gallery?: unknown[];
  mediaUrl?: string;
  liveUrl?: string;
  links?: { label?: string; url?: string }[];
  coverVideo?: string;
  body?: unknown;
  category?: Category;
};

export type Settings = {
  name?: string;
  tagline?: string;
  role?: string;
  profileImage?: unknown;
  bio?: unknown;
  email?: string;
  location?: string;
  available?: boolean;
  footerNote?: string;
  socials?: { label: string; url: string }[];
};

const projectFields = `_id, title, slug, year, role, excerpt, tags, featured, order,
  coverImage, mediaUrl, liveUrl, links, coverVideo, category->{ _id, name, slug }`;

export async function getSettings(): Promise<Settings | null> {
  if (!client) return null;
  return loadQuery<Settings>(`*[_type == "settings"][0]`);
}

export async function getCategories(): Promise<Category[]> {
  if (!client) return [];
  return loadQuery<Category[]>(
    `*[_type == "category"] | order(order asc, name asc) { _id, name, slug, description, order }`,
  );
}

export async function getProjects(): Promise<Project[]> {
  if (!client) return [];
  return loadQuery<Project[]>(
    `*[_type == "project"] | order(year desc, order asc, _createdAt desc) { ${projectFields} }`,
  );
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!client) return null;
  return loadQuery<Project | null>(
    `*[_type == "project" && slug.current == $slug][0] { ..., coverImage, gallery, category->{ _id, name, slug } }`,
    { slug },
  );
}

export async function getSiblingProjects(slug: string): Promise<{
  prev: Project | null;
  next: Project | null;
}> {
  const all = await getProjects();
  const i = all.findIndex((p) => p.slug.current === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? all[i - 1] : null,
    next: i < all.length - 1 ? all[i + 1] : null,
  };
}
