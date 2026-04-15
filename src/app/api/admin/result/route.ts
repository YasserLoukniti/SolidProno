import { NextRequest, NextResponse } from 'next/server'
import { setMatchResult } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const { journee, result } = await req.json() as { journee: number; result: 'V' | 'N' | 'D' | null }

  if (!journee || (result !== null && !['V', 'N', 'D'].includes(result))) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const success = await setMatchResult(journee, result)
  if (!success) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
