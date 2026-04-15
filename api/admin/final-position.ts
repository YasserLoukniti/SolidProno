import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setActualPosition, cors } from '../_lib/storage'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { position } = req.body as { position: number | null }

  if (position !== null && (position < 1 || position > 16)) {
    return res.status(400).json({ error: 'Position must be between 1 and 16' })
  }

  setActualPosition(position)
  return res.status(200).json({ success: true })
}
