import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cors } from '../_lib/storage'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'raja2026'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body as { password: string }

  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true, token: 'admin-' + Date.now() })
  }

  return res.status(401).json({ error: 'Mot de passe incorrect' })
}
