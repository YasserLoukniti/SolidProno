import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_MATCHES } from '@/data/matches'
import type { AppData } from '@/types'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'raja2026'

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string }

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const freshData: AppData = {
    matches: INITIAL_MATCHES,
    users: [],
    actualPosition: null,
  }

  // Detect environment
  const isVercel = process.env.VERCEL === '1' || process.env.BLOB_READ_WRITE_TOKEN

  if (isVercel) {
    const { put } = await import('@vercel/blob')
    await put('solidprono-data.json', JSON.stringify(freshData), {
      access: 'private',
      addRandomSuffix: false,
    })
  } else {
    const fs = await import('fs')
    const path = await import('path')
    const dbPath = path.join(process.cwd(), 'data', 'db.json')
    fs.writeFileSync(dbPath, JSON.stringify(freshData, null, 2))
  }

  return NextResponse.json({ success: true, matchCount: freshData.matches.length })
}
