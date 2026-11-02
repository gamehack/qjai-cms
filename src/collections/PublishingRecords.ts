import type { CollectionConfig } from 'payload'
import { isAdminUser } from '../lib/access'

// Delivery records are an administrative audit trail.
export const PublishingRecords: CollectionConfig = {
  slug: 'publishing-records',
  admin: { useAsTitle: 'externalReference' },
  access: {
    read: ({ req }) => isAdminUser(req.user),
    create: ({ req }) => isAdminUser(req.user),
    update: ({ req }) => isAdminUser(req.user),
    delete: ({ req }) => isAdminUser(req.user),
  },
  fields: [
    { name: 'article', type: 'relationship', relationTo: 'articles', required: true },
    {
      name: 'channel', type: 'select', required: true,
      options: [{ label: '网站', value: 'website' }, { label: '外部平台', value: 'external' }],
    },
    {
      name: 'state', type: 'select', required: true, defaultValue: 'pending',
      options: [
        { label: '待处理', value: 'pending' },
        { label: '成功', value: 'succeeded' },
        { label: '失败', value: 'failed' },
      ],
    },
    { name: 'externalReference', type: 'text' },
    { name: 'errorMessage', type: 'textarea' },
    { name: 'deliveredAt', type: 'date' },
  ],
}
