import type { Project } from './sanity';

/** Join class names, ignoring falsy values. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Distinct years present across a project list, newest first. */
export function getYears(projects: Project[]): number[] {
  return [...new Set(projects.map((p) => p.year).filter((y): y is number => Boolean(y)))].sort(
    (a, b) => b - a,
  );
}

/** Slugs of the categories present across a project list. */
export function getUsedCategorySlugs(projects: Project[]): string[] {
  return [...new Set(projects.map((p) => p.category?.slug.current).filter(Boolean))] as string[];
}

export function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  return m ? m[1] : null;
}

export function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/** Convert a media URL to an embeddable iframe src (YouTube / Vimeo), or null. */
export function embedSrc(url?: string): string | null {
  if (!url) return null;
  const yt = extractYouTubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;
  const vm = extractVimeoId(url);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  return null;
}

/** True when the media URL points at a directly-playable video file. */
export function isDirectVideo(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
