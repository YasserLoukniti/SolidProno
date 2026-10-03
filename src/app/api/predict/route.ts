import { NextRequest, NextResponse } from 'next/server'
import { findUser, getData, setPrediction } from '@/lib/storage'
import { bearerToken } from '@/lib/userAuth'
import { isValidScore } from '@/data/scoring'
import { isOpenForPredictions } from '@/data/dates'
import type { Score } from '@/types'

export async function POST(req: NextRequest) {
  const token = bearerToken(req)
  const user = token ? await findUser(u => u.token === token) : undefined
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { journee, score } = await req.json() as { journee: number; score: Score | null }
  if (score !== null && !isValidScore(score)) {
    return NextResponse.json({ error: 'Score invalide' }, { status: 400 })
  }

  const match = (await getData()).matches.find(m => m.journee === journee)
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
  if (!isOpenForPredictions(match)) {
    return NextResponse.json({ error: 'Le match a déjà commencé' }, { status: 403 })
  }

  await setPrediction(user.id, journee, score ? { home: score.home, away: score.away } : null)
  return NextResponse.json({ success: true })
}
