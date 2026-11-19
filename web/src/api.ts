export interface Link {
  id: string
  code: string
  shortUrl: string
  targetUrl: string
  clickCount: number
  expiresAt: string | null
  createdAt: string
}

export interface LinkStats {
  linkId: string
  totalClicks: number
  daily: { day: string; clicks: number }[]
  topReferrers: { referrer: string; clicks: number }[]
  devices: { device: string; clicks: number }[]
}

interface AuthResponse {
  accessToken: string
  user: { id: string; email: string }
}

const TOKEN_KEY = 'shortener.token'

export const session = {
  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  save(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* private mode: the session just won't survive a reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const token = session.token
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(path, { ...init, headers })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? `Request failed (${res.status})`)
    throw new ApiError(message, res.status)
  }
  return body as T
}

export const api = {
  signUp: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signIn: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string }>('/api/auth/me'),
  listLinks: () =>
    request<{ items: Link[]; total: number }>('/api/links?limit=100'),
  createLink: (url: string, alias?: string) =>
    request<Link>('/api/links', {
      method: 'POST',
      body: JSON.stringify(alias ? { url, alias } : { url }),
    }),
  deleteLink: (id: string) =>
    request<void>(`/api/links/${id}`, { method: 'DELETE' }),
  stats: (id: string) => request<LinkStats>(`/api/links/${id}/stats`),
}
