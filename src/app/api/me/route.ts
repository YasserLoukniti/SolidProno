import { NextRequest, NextResponse } from 'next/server'
import { findUser, toPublicUser } from '@/lib/storage'
import { bearerToken } from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

// Renvoie le participant connecté avec tous ses pronostics, y compris ceux encore cachés aux autres
export async function GET(req: NextRequest) {
  const token = bearerToken(req)
  const user = token ? await findUser(u => u.token === token) : undefined
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(toPublicUser(user), { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
