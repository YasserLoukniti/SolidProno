import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUsers, addUser, cors } from './_lib/storage'
import type { User, Prediction, FinalPosition } from '../src/types'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, predictions, finalPosition } = req.body as {
    name: string
    predictions: Record<string, Prediction>
    finalPosition: FinalPosition
  }

  if (!name || !predictions || !finalPosition) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const users = getUsers()
  if (users.some(u => u.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(409).json({ error: 'Ce prénom est déjà pris' })
  }

  const user: User = {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    predictions,
    finalPosition,
  }

  addUser(user)
  return res.status(201).json(user)
}
