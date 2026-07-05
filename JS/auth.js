import { supabase } from './supabase-client.js'

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function getProfileByUsername(username) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/index.html'
}

export async function requireAuth(redirectTo = '/login.html') {
  const user = await getCurrentUser()
  if (!user) {
    window.location.href = redirectTo
    return null
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (!user) return null
  const profile = await getProfile(user.id)
  if (!profile || profile.role !== 'admin') {
    window.location.href = '/index.html'
    return null
  }
  return { user, profile }
}

export async function requireGuest(redirectTo = '/profile.html') {
  const user = await getCurrentUser()
  if (user) {
    window.location.href = redirectTo
    return null
  }
  return true
}
