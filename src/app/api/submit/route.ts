import { NextRequest, NextResponse } from 'next/server'
import { getData, addUser } from '@/lib/storage'
import type { User, Prediction, FinalPosition } from '@/types'

export async function POST(req: NextRequest) {
  const { name, predictions, finalPosition } = await req.json() as {
    name: string
    predictions: Record<string, Prediction>
    finalPosition: FinalPosition
  }

  if (!name || !predictions || !finalPosition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const data = await getData()
  if (data.users.some(u => u.name.toLowerCase() === name.trim().toLowerCase())) {
    return NextResponse.json({ error: 'Ce prenom est deja pris' }, { status: 409 })
  }

  const user: User = {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    predictions,
    finalPosition,
  }

  await addUser(user)
  return NextResponse.json(user, { status: 201 })
}
