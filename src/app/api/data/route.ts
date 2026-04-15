import { NextResponse } from 'next/server'
import { getData } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getData()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
