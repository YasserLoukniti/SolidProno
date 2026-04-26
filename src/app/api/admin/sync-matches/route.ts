import { NextResponse } from 'next/server'
import { INITIAL_MATCHES } from '@/data/matches'
import { MongoClient } from 'mongodb'

export async function POST() {
  const uri = process.env.MONGODB_URI
  if (!uri) return NextResponse.json({ error: 'MONGODB_URI not set' }, { status: 500 })

  const client = new MongoClient(uri)
  await client.connect()
  const col = client.db('solidprono').collection('appdata')

  const doc = await col.findOne({ _id: 'main' as unknown as import('mongodb').ObjectId })
  const existingResultsByJournee = new Map<number, 'V' | 'N' | 'D' | null>()
  if (doc?.matches) {
    for (const m of doc.matches as { journee: number; result: 'V' | 'N' | 'D' | null }[]) {
      existingResultsByJournee.set(m.journee, m.result)
    }
  }

  const newMatches = INITIAL_MATCHES.map(m => ({
    ...m,
    result: existingResultsByJournee.get(m.journee) ?? m.result,
  }))

  await col.updateOne(
    { _id: 'main' as unknown as import('mongodb').ObjectId },
    { $set: { matches: newMatches } },
    { upsert: true }
  )
  await client.close()

  return NextResponse.json({ success: true, matchCount: newMatches.length })
}
