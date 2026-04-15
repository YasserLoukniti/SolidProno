import { NextRequest, NextResponse } from 'next/server'
import { setActualPosition } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const { position } = await req.json() as { position: number | null }

  if (position !== null && (position < 1 || position > 16)) {
    return NextResponse.json({ error: 'Position must be between 1 and 16' }, { status: 400 })
  }

  await setActualPosition(position)
  return NextResponse.json({ success: true })
}
