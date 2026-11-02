import type { CollectionConfig } from 'payload'
import { isAdminUser, isEditorUser } from '../lib/access'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name' },
  access: {
    read: () => true,
    create: ({ req }) => isEditorUser(req.user) || isAdminUser(req.user),
    update: ({ req }) => isEditorUser(req.user) || isAdminUser(req.user),
    delete: ({ req }) => isAdminUser(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea' },
  ],
}
