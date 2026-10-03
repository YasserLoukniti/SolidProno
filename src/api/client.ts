import type { AppData, Match, Prediction, User } from '@/types'

export const SESSION_EXPIRED = 'Session admin expirée'

function assertAdminResponse(res: Response) {
  if (res.status === 401) throw new Error(SESSION_EXPIRED)
}

export async function fetchData(): Promise<AppData> {
  const res = await fetch('/api/data', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch data')
  return res.json()
}

// Session participant : jeton gardé dans le navigateur après inscription ou connexion
const TOKEN_KEY = 'solidprono_token'

export function getUserToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function clearUserToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

async function authenticate(path: string, name: string, password: string): Promise<User> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Erreur')
  try {
    localStorage.setItem(TOKEN_KEY, body.token)
  } catch {}
  return body.user
}

export function register(name: string, password: string): Promise<User> {
  return authenticate('/api/auth/register', name, password)
}

export function login(name: string, password: string): Promise<User> {
  return authenticate('/api/auth/login', name, password)
}

// null si personne n'est connecté ou si la session n'est plus valide
export async function fetchMe(): Promise<User | null> {
  const token = getUserToken()
  if (!token) return null
  const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (res.status === 401) {
    clearUserToken()
    return null
  }
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}

export async function savePrediction(journee: number, score: Prediction | null): Promise<void> {
  const res = await fetch('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getUserToken()}` },
    body: JSON.stringify({ journee, score }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? "Erreur lors de l'enregistrement")
  }
}

export async function adminLogin(password: string): Promise<{ success: boolean; token: string }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('Mot de passe incorrect')
  return res.json()
}

export async function updateMatch(
  journee: number,
  update: Partial<Pick<Match, 'adversaire' | 'lieu' | 'date' | 'postponed' | 'score'>>
): Promise<void> {
  const res = await fetch('/api/admin/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journee, ...update }),
  })
  assertAdminResponse(res)
  if (!res.ok) throw new Error('Failed to update match')
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await fetch('/api/admin/delete-user', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  assertAdminResponse(res)
  if (!res.ok) throw new Error('Failed to delete user')
}

export async function syncMatches(): Promise<{ matchCount: number }> {
  const res = await fetch('/api/admin/sync-matches', { method: 'POST' })
  assertAdminResponse(res)
  if (!res.ok) throw new Error('Failed to sync matches')
  return res.json()
}

export async function resetSeason(password: string): Promise<{ matchCount: number }> {
  const res = await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (res.status === 401) throw new Error('Mot de passe incorrect ou session expirée')
  if (!res.ok) throw new Error('Failed to reset season')
  return res.json()
}

export async function adminLogout(): Promise<void> {
  await fetch('/api/admin/login', { method: 'DELETE' })
}

export async function fetchAdminData(): Promise<AppData> {
  const res = await fetch('/api/admin/data', { cache: 'no-store' })
  assertAdminResponse(res)
  if (!res.ok) throw new Error('Failed to fetch admin data')
  return res.json()
}
