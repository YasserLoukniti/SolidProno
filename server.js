// Simple dev server to emulate Vercel serverless functions locally
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'data', 'db.json')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'raja2026'

const app = express()
app.use(cors())
app.use(express.json())

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// GET all data
app.get('/api/data', (req, res) => {
  res.json(readDB())
})

// POST submit predictions
app.post('/api/submit', (req, res) => {
  const { name, predictions, finalPosition } = req.body
  if (!name || !predictions || !finalPosition) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  const data = readDB()
  if (data.users.some(u => u.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(409).json({ error: 'Ce prénom est déjà pris' })
  }
  const user = {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    predictions,
    finalPosition,
  }
  data.users.push(user)
  writeDB(data)
  res.status(201).json(user)
})

// POST admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: 'admin-' + Date.now() })
  }
  res.status(401).json({ error: 'Mot de passe incorrect' })
})

// POST set match result
app.post('/api/admin/result', (req, res) => {
  const { journee, result } = req.body
  if (!journee || (result !== null && !['V', 'N', 'D'].includes(result))) {
    return res.status(400).json({ error: 'Invalid data' })
  }
  const data = readDB()
  const match = data.matches.find(m => m.journee === journee)
  if (!match) return res.status(404).json({ error: 'Match not found' })
  match.result = result
  writeDB(data)
  res.json({ success: true })
})

// DELETE user
app.delete('/api/admin/delete-user', (req, res) => {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })
  const data = readDB()
  const idx = data.users.findIndex(u => u.id === userId)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  data.users.splice(idx, 1)
  writeDB(data)
  res.json({ success: true })
})

// POST set final position
app.post('/api/admin/final-position', (req, res) => {
  const { position } = req.body
  if (position !== null && (position < 1 || position > 16)) {
    return res.status(400).json({ error: 'Position must be between 1 and 16' })
  }
  const data = readDB()
  data.actualPosition = position
  writeDB(data)
  res.json({ success: true })
})

const PORT = 3333
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
