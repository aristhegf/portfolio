import { definePlugin, type DocumentActionComponent } from 'sanity';
import { EyeOpenIcon } from '@sanity/icons/EyeOpen';

/**
 * "Open preview" document action — jumps from a studio document to the page it
 * renders on the site. Uses the studio's own origin (localhost in dev, the
 * deployed URL in production) so previews work from wherever the studio is
 * served. On an environment with draft preview enabled (see src/lib/sanity.ts),
 * the opened page will show unpublished edits.
 */

type Previewable = {
  _type?: string;
  slug?: { current?: string };
} | null;

function sitePathFor(doc: Previewable): string {
  switch (doc?._type) {
    case 'project':
      return doc.slug?.current ? `/work/${doc.slug.current}` : '/work';
    case 'category':
      return doc.slug?.current ? `/work?category=${doc.slug.current}` : '/work';
    default:
      return '/';
  }
}

const openPreviewAction: DocumentActionComponent = ({ draft, published }) => {
  const doc = (draft ?? published) as Previewable;
  return {
    label: 'Open preview',
    icon: EyeOpenIcon,
    onHandle: () => {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      window.open(`${base}${sitePathFor(doc)}`, '_blank', 'noopener');
    },
  };
};

export const previewActionsPlugin = definePlugin({
  name: 'portfolio-preview-actions',
  document: {
    actions: (prev) => [openPreviewAction, ...prev],
  },
});
