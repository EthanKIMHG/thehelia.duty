export const AUTH_SESSION_KEY = 'helia_auth_session'

export interface AuthSession {
  username: string
  loginAt: string
}

// Client-side helpers
export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(AUTH_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function setSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
