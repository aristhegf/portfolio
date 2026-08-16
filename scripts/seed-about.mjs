/**
 * Seeds the About page content into the Sanity `settings` document:
 *   - manifest: the giant scroll-lit statement
 *   - bio:      the full story, as portable-text blocks (one per paragraph)
 *
 * Usage:  node --env-file=.env scripts/seed-about.mjs
 * Requires SANITY_PROJECT_ID, SANITY_DATASET and SANITY_API_WRITE_TOKEN
 * in the environment (or .env).
 */
import { createClient } from '@sanity/client';
import { randomBytes } from 'node:crypto';

const projectId = process.env.SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !token) {
  console.error('Missing SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN in .env');
  process.exit(1);
}

// Placeholder facts — edit freely in the Studio. Only seeded when the
// settings document has no facts yet, so a Studio edit is never clobbered.
const FACTS = [
  { value: '10+', text: 'years of creative practice across design, code, and words' },
  { value: '40+', text: 'projects, products, and experiments brought to life' },
  { value: '3', text: 'core disciplines — editor · designer · writer' },
];

const BIO = `I’m Aris, and welcome to my craft. I’ve always considered myself a creative, a serial creative. I just didn’t always know what to call it.

As a teenager, I wrote poetry and spoken-word pieces. I was drawn to words, emotions and the idea of turning something I felt or imagined into something another person could experience. Later, that creativity found new forms. I started playing with graphics, making and editing videos, telling stories through content and learning how to make ideas look and feel the way I imagined them.

Then came technology.

I got curious about websites, design, software, AI and digital products. I started building things, often teaching myself along the way. What began as curiosity gradually became another creative outlet. A website stopped being just code to me. It became a canvas. A digital product became a story about how someone should move through an idea. AI became another tool I could experiment with.

Along the way, I’ve built businesses, worked on pet-related projects, explored SaaS ideas, designed digital experiences, experimented with branding, edited video, created content and found myself constantly moving between creative and technical work.

My background is a little unconventional. I studied Human Nutrition at the University of Ibadan. I’ve explored IT and software. I’ve built things around pets. I’ve spent countless hours learning design and technology on my own. I’ve written poetry, created spoken word, edited videos and now build digital experiences and products.

There is a thread running through all of it. I LIKE MAKING THINGS.

I like starting with a blank page and seeing what I can turn it into. Sometimes that page is a poem. Sometimes it’s a video timeline. Sometimes it’s a website, a brand, an app or a business idea.

That is what ArisTheGF represents.

Not a single profession. Not a carefully constructed personal brand designed to fit neatly into one industry.

Just the creative side of me, documented in public.

This portfolio is a collection of the things I’ve made, the things I’m experimenting with and the ideas I’ve decided were worth bringing to life.

I’m still exploring what I can do. And I intend to keep making things until I find out.`;

const bio = BIO.split(/\n\s*\n/).map((text) => {
  const key = randomBytes(6).toString('hex');
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}0`, text, marks: [] }],
  };
});

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

const doc = await client.fetch('*[_type == "settings"][0]');
if (!doc) {
  console.error('No settings document found — create one in the Studio first.');
  process.exit(1);
}

const patch = client.patch(doc._id).set({ bio });
if (!doc.facts || doc.facts.length === 0) {
  patch.set({ facts: FACTS });
}

await patch.commit();
console.log(
  `Patched settings (${doc._id}): bio ${bio.length} paragraphs` +
    `${doc.facts?.length ? '' : `, ${FACTS.length} facts`}.`,
);
