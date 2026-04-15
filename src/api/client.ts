import type { AppData, Prediction, FinalPosition, User } from '../types'

const BASE = '/api'

export async function fetchData(): Promise<AppData> {
  const res = await fetch(`${BASE}/data`)
  if (!res.ok) throw new Error('Failed to fetch data')
  return res.json()
}

export async function submitPredictions(
  name: string,
  predictions: Record<string, Prediction>,
  finalPosition: FinalPosition
): Promise<User> {
  const res = await fetch(`${BASE}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, predictions, finalPosition }),
  })
  if (res.status === 409) {
    throw new Error('Ce prénom est déjà pris')
  }
  if (!res.ok) throw new Error('Failed to submit')
  return res.json()
}

export async function adminLogin(password: string): Promise<{ success: boolean; token: string }> {
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('Mot de passe incorrect')
  return res.json()
}

export async function setMatchResult(journee: number, result: 'V' | 'N' | 'D' | null): Promise<void> {
  const res = await fetch(`${BASE}/admin/result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ journee, result }),
  })
  if (!res.ok) throw new Error('Failed to set result')
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/delete-user`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error('Failed to delete user')
}

export async function setFinalPosition(position: number | null): Promise<void> {
  const res = await fetch(`${BASE}/admin/final-position`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position }),
  })
  if (!res.ok) throw new Error('Failed to set position')
}
