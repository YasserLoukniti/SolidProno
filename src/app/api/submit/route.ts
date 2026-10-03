import { NextRequest, NextResponse } from 'next/server'
import { getData, addUser } from '@/lib/storage'
import { isValidScore } from '@/data/scoring'
import { isOpenForPredictions } from '@/data/dates'
import type { User, Prediction } from '@/types'

export async function POST(req: NextRequest) {
  const { name, predictions } = await req.json() as {
    name: string
    predictions: Record<string, Prediction>
  }

  if (!name?.trim() || !predictions) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const data = await getData()
  if (data.users.some(u => u.name.toLowerCase() === name.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Ce prenom est deja pris' }, { status: 409 })
  }

  // Seuls les matchs pas encore commencés peuvent être pronostiqués
  const open = new Set(data.matches.filter(m => isOpenForPredictions(m)).map(m => String(m.journee)))
  const cleaned: Record<string, Prediction> = {}
  for (const [journee, pred] of Object.entries(predictions)) {
    if (!open.has(journee) || !isValidScore(pred)) {
      return NextResponse.json({ error: `J${journee} : match déjà commencé ou pronostic invalide` }, { status: 400 })
    }
    cleaned[journee] = { home: pred.home, away: pred.away }
  }

  const user: User = {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    predictions: cleaned,
  }

  await addUser(user)
  return NextResponse.json(user, { status: 201 })
}
