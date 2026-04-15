import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getData, cors } from './_lib/storage'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const data = getData()
  return res.status(200).json(data)
}
