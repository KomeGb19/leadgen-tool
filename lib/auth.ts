import { supabaseBrowser } from './supabase'

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