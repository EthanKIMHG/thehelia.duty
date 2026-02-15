export const AUTH_SESSION_KEY = 'helia_auth_session'

export interface AuthSession {
  username: string
  loginAt: string
}

function getClientSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  const storage = window.sessionStorage
  if (!storage) return null

  if (
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function'
  ) {
    return null
  }

  return storage
}

// Client-side helpers
export function getSession(): AuthSession | null {
  const storage = getClientSessionStorage()
  if (!storage) return null

  const raw = storage.getItem(AUTH_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function setSession(session: AuthSession): void {
  const storage = getClientSessionStorage()
  if (!storage) return
  storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  const storage = getClientSessionStorage()
  if (!storage) return
  storage.removeItem(AUTH_SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
