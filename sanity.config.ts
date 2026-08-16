import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { schemaTypes } from './sanity/schema';
import { previewActionsPlugin } from './sanity/preview-actions';

// This file also runs in the browser (the studio is a client-side app), so only
// touch `process.env` when it actually exists. The literals are the fallback.
const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && 'env' in import.meta
    ? (import.meta.env as Record<string, string | undefined>)
    : {};
const processEnv =
  typeof process !== 'undefined' && typeof process.env === 'object'
    ? process.env
    : ({} as Record<string, string | undefined>);

const projectId = env.SANITY_PROJECT_ID ?? processEnv.SANITY_PROJECT_ID ?? 'pzvv0417';
const dataset = env.SANITY_DATASET ?? processEnv.SANITY_DATASET ?? 'production';

export default defineConfig({
  name: 'default',
  title: 'Portfolio Studio',
  projectId,
  dataset,
  plugins: [
    previewActionsPlugin(),
    // Visual Editing — loads the site in an iframe and, when the site runs with
    // PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true, lets you click any rendered
    // field to jump straight to its editor. The site is served from the same
    // origin as the studio, so the preview iframe uses that origin directly.
    presentationTool({
      previewUrl: { initial: '/' },
      resolve: {
        locations: {
          project: {
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) =>
              doc?.slug
                ? { locations: [{ title: doc.title ?? 'Project', href: `/work/${doc.slug}` }] }
                : null,
          },
          category: {
            select: { name: 'name', slug: 'slug.current' },
            resolve: (doc) =>
              doc?.slug
                ? { locations: [{ title: doc.name ?? 'Category', href: `/work?category=${doc.slug}` }] }
                : null,
          },
          settings: {
            select: { name: 'name' },
            resolve: () => ({ locations: [{ title: 'Home', href: '/' }] }),
          },
        },
      },
    }),
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .id('settings')
              .title('Site settings')
              .child(
                S.document().schemaType('settings').documentId('settings').title('Site settings'),
              ),
            S.divider(),
            S.documentTypeListItem('project').title('Projects'),
            S.documentTypeListItem('category').title('Skills / Categories'),
            S.documentTypeListItem('submission').title('Inquiries'),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});
