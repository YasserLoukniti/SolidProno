import { NextRequest, NextResponse } from 'next/server'
import { addUser, findUser, toPublicUser } from '@/lib/storage'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, hashPassword, newSessionToken } from '@/lib/userAuth'

export async function POST(req: NextRequest) {
  const { name, password } = await req.json() as { name: string; password: string }
  const trimmed = name?.trim() ?? ''

  if (trimmed.length < 2 || trimmed.length > 30) {
    return NextResponse.json({ error: 'Le prénom doit faire entre 2 et 30 caractères' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return NextResponse.json({ error: `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères` }, { status: 400 })
  }
  if (await findUser(u => u.name.toLowerCase() === trimmed.toLowerCase())) {
    return NextResponse.json({ error: 'Ce prénom est déjà pris' }, { status: 409 })
  }

  const user = {
    id: `${trimmed.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
    predictions: {},
    passwordHash: hashPassword(password),
    token: newSessionToken(),
  }
  await addUser(user)

  return NextResponse.json({ user: toPublicUser(user), token: user.token }, { status: 201 })
}
