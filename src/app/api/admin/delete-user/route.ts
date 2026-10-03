import { NextRequest, NextResponse } from 'next/server'
import { deleteUser } from '@/lib/storage'
import { isAdmin, unauthorized } from '@/lib/adminAuth'

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const { userId } = await req.json() as { userId: string }

  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const success = await deleteUser(userId)
  if (!success) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
