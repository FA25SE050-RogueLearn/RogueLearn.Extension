import axios, { AxiosError } from 'axios'
import { ApiErrorPayload, NormalizedApiErrorInfo } from '@/types/base/Error'
import { getAccessTokenFromCookies, getRefreshTokenFromCookies, getApiOrigin } from '@/lib/auth'
import { ensureSupabaseSession } from '@/lib/supabase'

const axiosClient = axios.create({ withCredentials: true })

let hasWarnedMissingApiUrl = false

const authInterceptor = async (config: any) => {
  if (!config.baseURL) {
    const env = (import.meta as any).env || {}
    const runtimeBase = (env.VITE_API_URL as string | undefined)
      || (env.NEXT_PUBLIC_API_URL as string | undefined)
      || (typeof window !== 'undefined' ? window.localStorage.getItem('rl_api_url') || undefined : undefined)
    if (runtimeBase) {
      config.baseURL = runtimeBase
    } else {
      config.baseURL = 'https://api.roguelearn.site/user-service'
      if (!hasWarnedMissingApiUrl) {
        hasWarnedMissingApiUrl = true
        console.warn('[axiosClient] API base URL env is undefined. Using default https://api.roguelearn.site/user-service')
      }
    }
  }

  try {
    const token = await getAccessTokenFromCookies()
    const refresh = await getRefreshTokenFromCookies()
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    if (token && refresh) {
      await ensureSupabaseSession(token, refresh)
    }
    const origin = getApiOrigin()
    console.log('[axiosClient] tokens', { origin, hasAccessToken: !!token, hasRefreshToken: !!refresh })
  } catch {}

  return config
}

axiosClient.interceptors.request.use(authInterceptor)

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizeApiError = (err: AxiosError): NormalizedApiErrorInfo => {
      const status = err.response?.status
      const payload = err.response?.data as ApiErrorPayload | undefined
      const message = payload?.error?.message ?? 'Request failed'
      const details = payload?.error?.details
      return { status, message, details }
    }

    if (axios.isAxiosError(error)) {
      const { status, message, details } = normalizeApiError(error)
      const isPollingEndpoint =
        error.config?.url?.includes('/generation-status/') ||
        error.config?.url?.includes('/generation-progress/')
      const is404 = status === 404
      ;(error as any).normalized = { status, message, details } as NormalizedApiErrorInfo
      ;(error as any).isPollingEndpoint = isPollingEndpoint
      ;(error as any).is404 = is404
    } else {
      console.error('Unexpected error', error)
    }

    return Promise.reject(error)
  }
)

export default axiosClient