import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const PASSWORD_MIN_LENGTH = 4
export const PASSWORD_MAX_LENGTH = 100

// Le mot de passe est stocké haché (scrypt + sel), jamais en clair
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const actual = scryptSync(password, salt, 32)
  const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function newSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}
