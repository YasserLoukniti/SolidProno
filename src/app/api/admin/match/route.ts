import { NextRequest, NextResponse } from 'next/server'
import type { MatchUpdate } from '@/lib/storage'
import { applyMatchUpdate } from '@/lib/matchUpdate'
import { isAdmin, unauthorized } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const { journee, ...update } = await req.json() as { journee: number } & MatchUpdate

  if (!journee) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const result = await applyMatchUpdate(journee, update)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ success: true })
}
