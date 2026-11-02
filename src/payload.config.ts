import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Articles } from './collections/Articles'
import { Categories } from './collections/Categories'
import { PublishingRecords } from './collections/PublishingRecords'
import { Users } from './collections/Users'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  serverURL: process.env.SITE_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
    importMap: { baseDir: dirname },
  },
  collections: [Users, Articles, Categories, PublishingRecords],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    },
    schemaName: 'qjai_content',
    disableCreateDatabase: true,
    push: false,
  }),
})
