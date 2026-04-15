import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'raja2026'

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string }

  if (password === ADMIN_PASSWORD) {
    return NextResponse.json({ success: true, token: 'admin-' + Date.now() })
  }

  return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
}
