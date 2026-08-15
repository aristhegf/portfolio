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
      name: 'bio',
      title: 'Bio',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'Shown on the About page.',
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
