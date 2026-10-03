import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'raja2026'

const COOKIE_NAME = 'solidprono_admin'

// Jeton dérivé du mot de passe : changer ADMIN_PASSWORD invalide toutes les sessions
function sessionToken(): string {
  return createHmac('sha256', ADMIN_PASSWORD).update('solidprono-admin-session').digest('hex')
}

export function setAdminSession(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearAdminSession(res: NextResponse) {
  res.cookies.delete(COOKIE_NAME)
}

export function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value
  const expected = sessionToken()
  return !!token && token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
