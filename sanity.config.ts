import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schema';

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
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});
