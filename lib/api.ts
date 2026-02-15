import { AUTH_SESSION_KEY } from './auth'

/**
 * Authenticated fetch wrapper that adds the auth session header to all requests.
 * Use this instead of native fetch() for API calls.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let session: string | null = null
  if (typeof window !== 'undefined') {
    const storage = window.sessionStorage
    if (storage && typeof storage.getItem === 'function') {
      session = storage.getItem(AUTH_SESSION_KEY)
    }
  }

  const headers = new Headers(options.headers)
  if (session) {
    headers.set('x-auth-session', session)
  }

  return fetch(url, {
    ...options,
    headers
  })
}
