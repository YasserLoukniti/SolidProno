import { NextRequest, NextResponse } from 'next/server'
import { getData, toPublicUser } from '@/lib/storage'
import { isAdmin, unauthorized } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

// Comme /api/data mais avec tous les pronostics, y compris ceux encore cachés aux participants
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const data = await getData()
  return NextResponse.json(
    { ...data, users: data.users.map(toPublicUser) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
