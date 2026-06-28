// Mock auth for the demo dashboard. No backend: a "session" is a profile in
// sessionStorage. Two independent sessions so they never collide:
//   - dealer  (KEY)       -> dealership dashboard
//   - platform admin (ADMIN_KEY) -> the admin panel ("us")
// Real auth is specified in SECURITY.md (HttpOnly cookies, Argon2id, MFA, server RBAC).
const KEY = 'vinsight:dealer:session'
const ADMIN_KEY = 'vinsight:platform:session'
const STAMP = '2026-06-27T09:00:00'

function read(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null') } catch { return null } }

export const getSession = () => read(KEY)
export const getAdminSession = () => read(ADMIN_KEY)

// Persist a validated session. `isAdmin` routes to the platform-admin key and stamps
// the platform-admin flag. Dealer sessions are bound to one tenant + one role.
export function signIn(session, isAdmin = false) {
  const full = { ...session, signedInAt: new Date(STAMP).toISOString(), ...(isAdmin ? { isPlatformAdmin: true } : {}) }
  sessionStorage.setItem(isAdmin ? ADMIN_KEY : KEY, JSON.stringify(full))
  return full
}

export function signOut(isAdmin = false) {
  sessionStorage.removeItem(isAdmin ? ADMIN_KEY : KEY)
}

// Dealer-scoped on purpose: an admin-only session must NOT satisfy RequireAuth (it would
// mount the dealer store with no dealershipId). Platform admin has its own guard.
export const isAuthed = () => !!getSession()
export const isPlatformAdmin = () => !!getAdminSession()?.isPlatformAdmin
