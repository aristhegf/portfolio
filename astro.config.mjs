// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import sanity from '@sanity/astro';

/** Read SANITY_* vars from the environment, falling back to a `.env` file. */
function envVars() {
  const vars = { ...process.env };
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !(match[1] in vars)) {
        vars[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return vars;
}

const vars = envVars();
const configured = Boolean(vars.SANITY_PROJECT_ID && vars.SANITY_DATASET);

// Workaround: @sanity/astro's own `sanity:module-dedupe` Vite plugin hard-codes
// `optimizeDeps.include` entries (react-compiler-runtime, styled-components,
// lodash/startCase.js) that Vite 8/Rolldown cannot pre-bundle under pnpm's strict
// node_modules, which sent the studio into an endless re-optimization loop and
// broke `/studio` hydration in dev. The integration documents this env var as the
// escape hatch; the studio works fine without the plugin's dedupe aliases.
process.env.SANITY_ASTRO_DISABLE_MODULE_DEDUPE = '1';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: vars.SITE_URL ?? 'http://localhost:4321',
  integrations: configured
    ? [
        react(),
        sanity({
          projectId: vars.SANITY_PROJECT_ID,
          dataset: vars.SANITY_DATASET,
          useCdn: true,
          studioBasePath: '/studio',
        }),
      ]
    : [],
});
