import type { BeforeListServerProps } from 'payload'
import { isAdminUser } from '../../lib/access'
import { PublishAllDraftsButtonClient } from './PublishAllDraftsButtonClient'

export function PublishAllDraftsButton({ user }: BeforeListServerProps) {
  if (!isAdminUser(user)) return null
  return <PublishAllDraftsButtonClient />
}
