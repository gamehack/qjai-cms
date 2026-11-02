import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Payload's first-user bootstrap is a dedicated operation. After bootstrap,
    // all account creation remains authenticated and no public registration exists.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 60 * 60 * 2,
  },
  admin: { useAsTitle: 'email' },
  access: {
    admin: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [{ name: 'displayName', type: 'text' }],
}
