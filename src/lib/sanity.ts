import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const projectId = import.meta.env.SANITY_PROJECT_ID as string | undefined;
export const dataset = (import.meta.env.SANITY_DATASET || 'production') as string;

export const isConfigured = Boolean(projectId);

/** Shared Sanity client. Public read-only credentials only — no token needed. */
export const client = isConfigured
  ? createClient({
      projectId: projectId!,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: true,
    })
  : null;

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
  return client.fetch(`*[_type == "settings"][0]`);
}

export async function getCategories(): Promise<Category[]> {
  if (!client) return [];
  return client.fetch(
    `*[_type == "category"] | order(order asc, name asc) { _id, name, slug, description, order }`,
  );
}

export async function getProjects(): Promise<Project[]> {
  if (!client) return [];
  return client.fetch(
    `*[_type == "project"] | order(year desc, order asc, _createdAt desc) { ${projectFields} }`,
  );
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  if (!client) return null;
  return client.fetch(
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
