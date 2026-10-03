import { NextRequest, NextResponse } from 'next/server'
import { findUser, toPublicUser } from '@/lib/storage'
import { verifyPin } from '@/lib/userAuth'

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json() as { name: string; pin: string }
  const trimmed = name?.trim().toLowerCase() ?? ''

  const user = await findUser(u => u.name.toLowerCase() === trimmed)
  if (!user || !verifyPin(pin ?? '', user.pinHash)) {
    return NextResponse.json({ error: 'Prénom ou code incorrect' }, { status: 401 })
  }

  return NextResponse.json({ user: toPublicUser(user), token: user.token })
}
