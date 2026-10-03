import { NextRequest, NextResponse } from 'next/server'
import { addUser, findUser, toPublicUser } from '@/lib/storage'
import { PIN_FORMAT, hashPin, newSessionToken } from '@/lib/userAuth'

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json() as { name: string; pin: string }
  const trimmed = name?.trim() ?? ''

  if (trimmed.length < 2 || trimmed.length > 30) {
    return NextResponse.json({ error: 'Le prénom doit faire entre 2 et 30 caractères' }, { status: 400 })
  }
  if (!PIN_FORMAT.test(pin ?? '')) {
    return NextResponse.json({ error: 'Le code doit faire 4 chiffres' }, { status: 400 })
  }
  if (await findUser(u => u.name.toLowerCase() === trimmed.toLowerCase())) {
    return NextResponse.json({ error: 'Ce prénom est déjà pris' }, { status: 409 })
  }

  const user = {
    id: `${trimmed.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
    predictions: {},
    pinHash: hashPin(pin),
    token: newSessionToken(),
  }
  await addUser(user)

  return NextResponse.json({ user: toPublicUser(user), token: user.token }, { status: 201 })
}
