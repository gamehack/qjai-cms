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

export function assignInitialAdministrator<T extends { isAdmin?: boolean }>(
  data: T,
  existingUserCount: number,
): T {
  return existingUserCount === 0 ? { ...data, isAdmin: true } : data
}

export function preventNonAdminPromotion<T extends { isAdmin?: boolean }>(
  data: T,
  user: CMSUser,
): T {
  return isAdminUser(user) ? data : { ...data, isAdmin: false }
}

export function preserveLastAdministrator<T extends { isAdmin?: boolean }>(
  data: T,
  user: CMSUser,
  isLastAdmin: boolean,
): T {
  if (isAdminUser(user) && data.isAdmin === false && isLastAdmin) {
    return { ...data, isAdmin: true }
  }
  return data
}

export function preventEditorPublication<T extends { status?: string; publishedAt?: string | null }>(
  data: T,
  user: CMSUser,
): T {
  if (!isAdminUser(user) && data.status === 'published') {
    return { ...data, status: 'review', publishedAt: null }
  }
  return data
}
