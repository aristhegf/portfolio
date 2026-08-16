import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'settings',
  title: 'Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Your name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / eyebrow',
      type: 'string',
      description: 'Short label under your name, e.g. Editor · Designer · Writer',
    }),
    defineField({
      name: 'profileImage',
      title: 'Profile image',
      type: 'image',
      options: { hotspot: true },
      description: 'Your portrait — shown on the About page. Square or portrait crops work best.',
    }),
    defineField({
      name: 'tagline',
      title: 'Headline',
      type: 'string',
      description: 'Big serif headline on the home page.',
    }),
    defineField({
      name: 'heroQuotes',
      title: 'Hero quotes',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'Rotating quotes on the home page hero — one is shown every 3 seconds. If empty, defaults are used.',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Your story on the About page, set in justified text.',
    }),
    defineField({
      name: 'facts',
      title: 'Facts (About page)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'The big number — e.g. 10+, 40+, 3',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'text',
              title: 'Text',
              type: 'string',
              description: 'What the number stands for — e.g. projects shipped',
              validation: (rule) => rule.required(),
            }),
          ],
        },
      ],
      description: 'The facts row between the manifesto and the story on the About page.',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Enter a valid email address.';
        }),
    }),
    defineField({
      name: 'phone',
      title: 'Phone / WhatsApp',
      type: 'string',
      description:
        'Shown in the contact sections with call and WhatsApp links — e.g. "+234 916 129 4881".',
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
    }),
    defineField({
      name: 'available',
      title: 'Available for work',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string', title: 'Label' }),
            defineField({ name: 'url', type: 'url', title: 'URL' }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'name' },
    prepare: () => ({ title: 'Site settings' }),
  },
});
