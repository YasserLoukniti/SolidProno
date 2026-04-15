import type { AppData, Prediction, FinalPosition, User } from '@/types'

export async function fetchData(): Promise<AppData> {
  const res = await fetch('/api/data', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch data')
  return res.json()
}

export async function submitPredictions(
  name: string,
  predictions: Record<string, Prediction>,
  finalPosition: FinalPosition
): Promise<User> {
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, predictions, finalPosition }),
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

export async function setMatchResult(journee: number, result: 'V' | 'N' | 'D' | null): Promise<void> {
  const res = await fetch('/api/admin/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journee, result }),
  })
  if (!res.ok) throw new Error('Failed to set result')
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await fetch('/api/admin/delete-user', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error('Failed to delete user')
}

export async function setFinalPosition(position: number | null): Promise<void> {
  const res = await fetch('/api/admin/final-position', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position }),
  })
  if (!res.ok) throw new Error('Failed to set position')
}
