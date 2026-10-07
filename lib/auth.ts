import { supabaseBrowser } from './supabase'
import type { UserRole, UserPermissions } from './types'

export { supabaseBrowser }

export const signInWithEmail = async (email: string, password: string) => {
  const supabase = supabaseBrowser()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const supabase = supabaseBrowser()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const supabase = supabaseBrowser()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Get the current user's role and state permissions (client-side)
 * Returns null if user is not authenticated or has no permissions
 */
const roleName = (row: any): string | undefined =>
  Array.isArray(row.user_roles) ? row.user_roles[0]?.name : row.user_roles?.name

/**
 * Get the current user's role and state permissions (client-side, for UI only).
 * The API routes do their own check on the server.
 */
export const getUserPermissions = async (): Promise<UserPermissions | null> => {
  const supabase = supabaseBrowser()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_state_permissions')
    .select('state_code, user_roles!inner(name)')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching user permissions:', error)
    return null
  }

  if (!data || data.length === 0) return null

  // super_user: any row with that role (state_code is NULL for it)
  if (data.some((row) => roleName(row) === 'super_user')) {
    return { isSuperUser: true, role: 'super_user', allowedStates: null }
  }

  const allowedStates = data
    .filter((row) => roleName(row) === 'state_user' && row.state_code)
    .map((row) => String(row.state_code).trim().toUpperCase())

  if (allowedStates.length > 0) {
    return { isSuperUser: false, role: 'state_user', allowedStates }
  }

  return null
}

/** fetch() that attaches the logged-in user's access token for our API routes */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: { session } } = await supabaseBrowser().auth.getSession()
  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(input, { ...init, headers })
}