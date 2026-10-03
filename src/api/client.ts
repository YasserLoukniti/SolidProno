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

export async function submitPredictions(
  name: string,
  predictions: Record<string, Prediction>
): Promise<User> {
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, predictions }),
  })
  if (res.status === 409) throw new Error('Ce prenom est deja pris')
  if (!res.ok) throw new Error('Failed to submit')
  return res.json()
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
