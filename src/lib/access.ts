export type CMSUser = {
  id?: string | number
  isAdmin?: boolean
} | null | undefined

export function isAdminUser(user: CMSUser): boolean {
  return user?.isAdmin === true
}

export function isEditorUser(user: CMSUser): boolean {
  return Boolean(user) && !isAdminUser(user)
}
