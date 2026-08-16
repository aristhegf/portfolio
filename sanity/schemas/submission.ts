import { defineField, defineType } from 'sanity';

/**
 * One planner-form inquiry, created by the /api/planner endpoint (never by
 * hand). All fields are read-only — the Studio is for viewing and sorting.
 */
export default defineType({
  name: 'submission',
  title: 'Inquiry',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'contact',
      title: 'Contact',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'phone',
      title: 'Phone / WhatsApp',
      type: 'string',
      readOnly: true,
      description: 'Optional phone number the visitor left.',
    }),
    defineField({
      name: 'company',
      title: 'Company / website',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'projectType',
      title: 'Project type',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'budget',
      title: 'Budget',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'timeline',
      title: 'Timeline',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'task',
      title: 'Task',
      type: 'text',
      rows: 6,
      readOnly: true,
    }),
    defineField({
      name: 'fileAsset',
      title: 'Attached file',
      type: 'file',
      readOnly: true,
      description: 'The document the visitor attached — stored as a Sanity asset.',
    }),
    defineField({
      name: 'fileName',
      title: 'Attached file name',
      type: 'string',
      readOnly: true,
      description: 'Original filename, for quick reference.',
    }),
  ],
  preview: {
    select: {
      name: 'name',
      projectType: 'projectType',
      phone: 'phone',
    },
    prepare: ({ name, projectType, phone }) => ({
      title: name || 'Unnamed inquiry',
      subtitle: [projectType, phone].filter(Boolean).join(' — ') || 'Inquiry',
    }),
  },
});
