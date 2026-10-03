import { NextResponse } from 'next/server'
import { getPublicData } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getPublicData()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
