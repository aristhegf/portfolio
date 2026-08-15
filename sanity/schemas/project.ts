import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 80 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Skill / Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'Filters the portfolio by year.',
      validation: (rule) => rule.required().integer().min(1900).max(2100),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description: 'e.g. Editor · Designer · Developer',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 2,
      description: 'One or two sentences shown on cards and list pages.',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      options: { hotspot: true },
      description: 'Aspect ratio ~4:3 works best on cards.',
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      of: [
        { type: 'image', options: { hotspot: true } },
        {
          type: 'object',
          name: 'video',
          title: 'Video',
          fields: [
            defineField({ name: 'url', title: 'Video URL', type: 'string', description: 'Direct .mp4/.webm, YouTube, or Vimeo URL.' }),
            defineField({ name: 'caption', title: 'Caption', type: 'string' }),
          ],
        },
      ],
      description: 'Extra media on the project page — images, GIFs, or inline videos.',
    }),
    defineField({
      name: 'mediaUrl',
      title: 'Video link',
      type: 'string',
      description:
        'YouTube / Vimeo link (e.g. https://youtu.be/xxxx) or a direct .mp4 URL. Shown on the project page.',
    }),
    defineField({
      name: 'liveUrl',
      title: 'Live site / external link',
      type: 'url',
      description: 'Primary link out to a live website or final deliverable. Shown as the main button on the project page.',
    }),
    defineField({
      name: 'links',
      title: 'More links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', description: 'e.g. Case study, Behance, PDF' }),
            defineField({ name: 'url', title: 'URL', type: 'url' }),
          ],
        },
      ],
      description: 'Extra links shown on the project page (case study, Behance, downloads).',
    }),
    defineField({
      name: 'coverVideo',
      title: 'Animated cover (video)',
      type: 'string',
      description: 'Optional direct .mp4/.webm URL. Loops on the card on hover and on the project page, Dribbble-style. Falls back to the cover image.',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', title: 'Inline image', options: { hotspot: true } },
      ],
      description: 'Project description — or the full text for poems and articles.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured on home page',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Manual order (lowest first)',
      type: 'number',
      description: 'Within the same year, lower numbers appear first.',
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: 'Year, newest first', name: 'yearDesc', by: [{ field: 'year', direction: 'desc' }] },
    { title: 'Title', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category.name',
      year: 'year',
      media: 'coverImage',
    },
  },
});
