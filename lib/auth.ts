import { browser } from 'wxt/browser';

// Admin roles that have access to syllabus import
const ADMIN_ROLES = ['Guild Master', 'Admin', 'admin'];

/**
 * Decode a JWT token without verification (for reading claims only)
 */
export function decodeJwt(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64url decode
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if user has admin role based on JWT claims
 */
export function hasAdminRole(jwtPayload: any): boolean {
  if (!jwtPayload) return false;
  
  // Check 'roles' array in JWT (based on the example JWT structure)
  const roles = jwtPayload.roles || [];
  return roles.some((role: string) => ADMIN_ROLES.includes(role));
}

/**
 * Get user roles from JWT
 */
export function getUserRoles(jwtPayload: any): string[] {
  if (!jwtPayload) return [];
  return jwtPayload.roles || [];
}

/**
 * Check if current user is admin (has syllabus import permission)
 */
export async function checkIsAdmin(): Promise<{ isAdmin: boolean; roles: string[]; email: string | null }> {
  try {
    const accessToken = await getAccessTokenFromCookies();
    if (!accessToken) {
      return { isAdmin: false, roles: [], email: null };
    }
    
    const payload = decodeJwt(accessToken);
    if (!payload) {
      return { isAdmin: false, roles: [], email: null };
    }
    
    const roles = getUserRoles(payload);
    const isAdmin = hasAdminRole(payload);
    const email = payload.email || payload.user_metadata?.email || null;
    
    console.log('[auth] Admin check:', { isAdmin, roles, email });
    return { isAdmin, roles, email };
  } catch (error) {
    console.error('[auth] Error checking admin status:', error);
    return { isAdmin: false, roles: [], email: null };
  }
}

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
    const url = origin ?? getAppOrigin() ?? 'http://localhost:3000'
    if (!url) return undefined
    const c = await browser.cookies.get({ url, name })
    console.log(`[auth] getCookie(${name}) from ${url}:`, c ? 'found' : 'not found')
    return c?.value
  } catch (e) {
    console.warn(`[auth] getCookie(${name}) error:`, e)
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