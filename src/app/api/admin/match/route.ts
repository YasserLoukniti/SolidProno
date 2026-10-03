import { NextRequest, NextResponse } from 'next/server'
import { updateMatch, type MatchUpdate } from '@/lib/storage'
import { OPPONENTS, buildAdversaire, getOpponent } from '@/data/teams'
import { isValidScore, scoreToResult } from '@/data/scoring'
import { getData } from '@/lib/storage'
import { isAdmin, unauthorized } from '@/lib/adminAuth'

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const body = await req.json() as { journee: number } & MatchUpdate
  const { journee } = body

  if (!journee) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const update: MatchUpdate = {}

  if ('score' in body) {
    if (body.score !== null && !isValidScore(body.score)) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }
    update.score = body.score ? { home: body.score.home, away: body.score.away } : null
  }

  if ('date' in body) {
    if (body.date !== null && !DATE_FORMAT.test(body.date as string)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    update.date = body.date
  }

  if ('postponed' in body) {
    if (typeof body.postponed !== 'boolean') {
      return NextResponse.json({ error: 'Invalid postponed flag' }, { status: 400 })
    }
    update.postponed = body.postponed
  }

  if ('adversaire' in body || 'lieu' in body) {
    const opponent = body.adversaire ? getOpponent(body.adversaire) : ''
    if (!OPPONENTS.includes(opponent) || !['Domicile', 'Extérieur'].includes(body.lieu as string)) {
      return NextResponse.json({ error: 'Invalid opponent or venue' }, { status: 400 })
    }
    update.lieu = body.lieu
    update.adversaire = buildAdversaire(opponent, body.lieu!)
  }

  // Le résultat est toujours déduit du score et du lieu
  const current = (await getData()).matches.find(m => m.journee === journee)
  if (!current) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  const score = 'score' in update ? update.score : current.score
  update.result = score ? scoreToResult(score, update.lieu ?? current.lieu) : null

  const success = await updateMatch(journee, update)
  if (!success) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
