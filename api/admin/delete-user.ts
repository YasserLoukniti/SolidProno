import type { VercelRequest, VercelResponse } from '@vercel/node'
import { deleteUser, cors } from '../_lib/storage'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body as { userId: string }

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  const success = deleteUser(userId)
  if (!success) {
    return res.status(404).json({ error: 'User not found' })
  }

  return res.status(200).json({ success: true })
}
