import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, unauthorized } from '@/lib/adminAuth'
import { INITIAL_MATCHES } from '@/data/matches'
import { MongoClient } from 'mongodb'
import type { Match } from '@/types'
import { scoreToResult } from '@/data/scoring'

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const uri = process.env.MONGODB_URI
  if (!uri) return NextResponse.json({ error: 'MONGODB_URI not set' }, { status: 500 })

  const client = new MongoClient(uri)
  await client.connect()
  const col = client.db('solidprono').collection('appdata')

  const doc = await col.findOne({ _id: 'main' as unknown as import('mongodb').ObjectId })
  const existingByJournee = new Map<number, Match>()
  for (const m of (doc?.matches ?? []) as Match[]) existingByJournee.set(m.journee, m)

  // Garde les scores saisis ; le résultat est recalculé car le lieu peut avoir changé
  const newMatches = INITIAL_MATCHES.map(m => {
    const score = existingByJournee.get(m.journee)?.score ?? m.score
    return { ...m, score, result: score ? scoreToResult(score, m.lieu) : null }
  })

  await col.updateOne(
    { _id: 'main' as unknown as import('mongodb').ObjectId },
    { $set: { matches: newMatches } },
    { upsert: true }
  )
  await client.close()

  return NextResponse.json({ success: true, matchCount: newMatches.length })
}
