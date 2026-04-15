import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setMatchResult, cors } from '../_lib/storage'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { journee, result } = req.body as { journee: number; result: 'V' | 'N' | 'D' | null }

  if (!journee || (result !== null && !['V', 'N', 'D'].includes(result))) {
    return res.status(400).json({ error: 'Invalid data' })
  }

  const success = setMatchResult(journee, result)
  if (!success) {
    return res.status(404).json({ error: 'Match not found' })
  }

  return res.status(200).json({ success: true })
}
