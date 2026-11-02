import type { CollectionConfig } from 'payload'

// Track delivery outcomes for each publication channel.
export const PublishingRecords: CollectionConfig = {
  slug: 'publishing-records',
  admin: { useAsTitle: 'externalReference' },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
