import { NextResponse } from 'next/server'
import { getData } from '@/lib/storage'

export async function GET() {
  const data = await getData()
  return NextResponse.json(data)
}
