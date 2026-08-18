import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Alias — some files import cx instead of cn */
export const cx = cn;

/**
 * Extract years from an array of projects for filtering
 */
export function getYears(projects: { year?: string | number }[]): number[] {
  const years = new Set<number>();
  for (const p of projects) {
    if (p.year) {
      const y = typeof p.year === 'string' ? parseInt(p.year, 10) : p.year;
      if (!isNaN(y)) years.add(y);
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Check if a URL is a direct video file
 */
export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

/**
 * Build an embeddable src URL from a video hosting platform
 * (YouTube, Vimeo, etc.)
 */
export function embedSrc(url: string): string {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Already embeddable or unknown — return as-is
  return url;
}

/**
 * Extract initials from a name
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}
