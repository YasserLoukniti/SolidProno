import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_PASSWORD, clearAdminSession, setAdminSession } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string }

  if (password === ADMIN_PASSWORD) {
    const res = NextResponse.json({ success: true, token: 'admin-' + Date.now() })
    setAdminSession(res)
    return res
  }

  return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  clearAdminSession(res)
  return res
}
