export function getApiOrigin(): string | null {
  const env = (import.meta as any).env || {}
  const base = (env.VITE_API_URL as string | undefined)
    || (env.NEXT_PUBLIC_API_URL as string | undefined)
    || (typeof window !== 'undefined' ? window.localStorage.getItem('rl_api_url') || undefined : undefined)
    || 'https://api.roguelearn.site/user-service'
  try {
    const u = new URL(base)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

export function getAppOrigin(): string {
  const env = (import.meta as any).env || {}
  const base = (env.VITE_APP_ORIGIN as string | undefined)
    || (typeof window !== 'undefined' ? window.localStorage.getItem('rl_app_origin') || undefined : undefined)
    || 'http://localhost:3000'
  try {
    const u = new URL(base)
    return `${u.protocol}//${u.host}`
  } catch {
    return 'http://localhost:3000'
  }
}

export async function getCookie(name: string, origin?: string): Promise<string | undefined> {
  try {
    const url = origin ?? getAppOrigin() ?? undefined
    if (!url) return undefined
    const c = await browser.cookies.get({ url: 'http://localhost:3000', name })
    return c?.value
  } catch {
    return undefined
  }
}

export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  return getCookie('rl_access_token')
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  return getCookie('rl_refresh_token')
}

export async function getAuthStatus(): Promise<{ origin: string | null; hasAccess: boolean; hasRefresh: boolean }> {
  const origin = getApiOrigin()
  const access = await getAccessTokenFromCookies()
  const refresh = await getRefreshTokenFromCookies()
  return { origin, hasAccess: !!access, hasRefresh: !!refresh }
}