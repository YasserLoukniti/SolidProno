import { NextRequest, NextResponse } from 'next/server'
import { INITIAL_MATCHES } from '@/data/matches'
import type { AppData } from '@/types'
import { MongoClient } from 'mongodb'

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

  const uri = process.env.MONGODB_URI
  if (uri) {
    const client = new MongoClient(uri)
    await client.connect()
    const col = client.db('solidprono').collection('appdata')
    await col.replaceOne({ _id: 'main' as unknown as import('mongodb').ObjectId }, freshData, { upsert: true })
    await client.close()
  }

  return NextResponse.json({ success: true, matchCount: freshData.matches.length })
}
