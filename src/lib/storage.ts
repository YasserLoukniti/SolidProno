import type { AppData, Match, User } from '@/types'
import { INITIAL_MATCHES } from '@/data/matches'

// In production (Vercel), use KV. In dev, use local JSON file.
const isVercel = process.env.VERCEL === '1' || process.env.KV_REST_API_URL

async function getKV() {
  const { kv } = await import('@vercel/kv')
  return kv
}

// ---- LOCAL DEV (JSON file) ----
import fs from 'fs'
import path from 'path'
const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

function readLocal(): AppData {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch {
    const init: AppData = { matches: INITIAL_MATCHES, users: [], actualPosition: null }
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2))
    return init
  }
}
function writeLocal(data: AppData) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// ---- VERCEL KV ----
const KV_KEY = 'solidprono:data'

// ---- PUBLIC API ----
export async function getData(): Promise<AppData> {
  if (isVercel) {
    const kv = await getKV()
    const data = await kv.get<AppData>(KV_KEY)
    if (!data) {
      const init: AppData = { matches: INITIAL_MATCHES, users: [], actualPosition: null }
      await kv.set(KV_KEY, init)
      return init
    }
    return data
  }
  return readLocal()
}

async function saveData(data: AppData) {
  if (isVercel) {
    const kv = await getKV()
    await kv.set(KV_KEY, data)
  } else {
    writeLocal(data)
  }
}

export async function addUser(user: User) {
  const data = await getData()
  data.users.push(user)
  await saveData(data)
}

export async function deleteUser(userId: string): Promise<boolean> {
  const data = await getData()
  const idx = data.users.findIndex(u => u.id === userId)
  if (idx === -1) return false
  data.users.splice(idx, 1)
  await saveData(data)
  return true
}

export async function setMatchResult(journee: number, result: 'V' | 'N' | 'D' | null): Promise<boolean> {
  const data = await getData()
  const match = data.matches.find(m => m.journee === journee)
  if (!match) return false
  match.result = result
  await saveData(data)
  return true
}

export async function setActualPosition(position: number | null) {
  const data = await getData()
  data.actualPosition = position
  await saveData(data)
}
