/**
 * Client-side API fetch helper
 * Handles 401 by clearing token and redirecting to login
 */

export function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken')
    window.location.href = '/login'
  }
}

/** Call after fetch - redirects to login if 401. Returns false if redirected. */
export function handleAuthResponse(res: Response): boolean {
  if (res.status === 401) {
    redirectToLogin()
    return false
  }
  return true
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, { ...options, headers })

  if (!handleAuthResponse(res)) {
    throw new Error('Session expired. Please log in again.')
  }

  return res
}
