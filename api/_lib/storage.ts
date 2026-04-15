import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AppData, Match, User } from '../../src/types'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

function readDB(): AppData {
  const raw = fs.readFileSync(DB_PATH, 'utf-8')
  return JSON.parse(raw)
}

function writeDB(data: AppData): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export function getMatches(): Match[] {
  return readDB().matches
}

export function getUsers(): User[] {
  return readDB().users
}

export function getActualPosition(): number | null {
  return readDB().actualPosition
}

export function getData(): AppData {
  return readDB()
}

export function addUser(user: User): void {
  const data = readDB()
  data.users.push(user)
  writeDB(data)
}

export function deleteUser(userId: string): boolean {
  const data = readDB()
  const idx = data.users.findIndex(u => u.id === userId)
  if (idx === -1) return false
  data.users.splice(idx, 1)
  writeDB(data)
  return true
}

export function setMatchResult(journee: number, result: 'V' | 'N' | 'D' | null): boolean {
  const data = readDB()
  const match = data.matches.find(m => m.journee === journee)
  if (!match) return false
  match.result = result
  writeDB(data)
  return true
}

export function setActualPosition(position: number | null): void {
  const data = readDB()
  data.actualPosition = position
  writeDB(data)
}

export function cors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return true
  }
  return false
}
