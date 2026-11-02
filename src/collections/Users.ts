import type { CollectionConfig } from 'payload'
import { assignInitialAdministrator, isAdminUser, preventNonAdminPromotion, preserveLastAdministrator } from '../lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 60 * 60 * 2,
  },
  admin: { useAsTitle: 'email' },
  access: {
    admin: ({ req }) => isAdminUser(req.user),
    read: ({ req }) => isAdminUser(req.user),
    create: ({ req }) => isAdminUser(req.user),
    update: ({ req }) => isAdminUser(req.user),
    delete: async ({ req, id }) => {
      if (!isAdminUser(req.user)) return false
      if (String(req.user?.id) !== String(id)) return true
      const admins = await req.payload.count({
        collection: 'users',
        where: { isAdmin: { equals: true } },
        overrideAccess: true,
      })
      return admins.totalDocs > 1
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, id, operation, req }) => {
        if (operation === 'create') {
          const existing = await req.payload.count({
            collection: 'users',
            overrideAccess: true,
          })
          if (existing.totalDocs === 0) {
            // The dedicated first-user bootstrap is the only unauthenticated
            // path that may create an administrator.
            return assignInitialAdministrator(data, existing.totalDocs)
          }
        }

        // A non-admin can never promote an account through a crafted payload.
        if (!isAdminUser(req.user)) return preventNonAdminPromotion(data, req.user)

        // Do not let the only administrator accidentally lock themselves out.
        if (operation === 'update' && data.isAdmin === false &&
            String(req.user?.id) === String(id)) {
          const admins = await req.payload.count({
            collection: 'users',
            where: { isAdmin: { equals: true } },
            overrideAccess: true,
          })
          return preserveLastAdministrator(data, req.user, admins.totalDocs <= 1)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'displayName', type: 'text' },
    {
      name: 'isAdmin',
      type: 'checkbox',
      defaultValue: false,
      saveToJWT: true,
      access: {
        create: ({ req }) => isAdminUser(req.user),
        update: ({ req }) => isAdminUser(req.user),
      },
      admin: { description: 'Administrators can manage users and publish articles.' },
    },
  ],
}
