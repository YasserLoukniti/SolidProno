import type { AppData, User } from '@/types'
import { INITIAL_MATCHES } from '@/data/matches'

const isVercel = process.env.VERCEL === '1' || process.env.BLOB_READ_WRITE_TOKEN

const BLOB_NAME = 'solidprono-data.json'
const INITIAL_DATA: AppData = { matches: INITIAL_MATCHES, users: [], actualPosition: null }

// ---- LOCAL DEV (JSON file) ----
import fs from 'fs'
import path from 'path'
const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

function readLocal(): AppData {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2))
    return INITIAL_DATA
  }
}
function writeLocal(data: AppData) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// ---- VERCEL BLOB ----
async function readBlob(): Promise<AppData> {
  const { list, put } = await import('@vercel/blob')

  // Check if our blob exists
  const { blobs } = await list({ prefix: BLOB_NAME })
  if (blobs.length === 0) {
    // First time: create the blob with initial data
    await put(BLOB_NAME, JSON.stringify(INITIAL_DATA), {
      access: 'public',
      addRandomSuffix: false,
    })
    return INITIAL_DATA
  }

  // Read the blob
  const res = await fetch(blobs[0].url)
  return res.json()
}

async function writeBlob(data: AppData) {
  const { put } = await import('@vercel/blob')
  await put(BLOB_NAME, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
  })
}

// ---- PUBLIC API ----
export async function getData(): Promise<AppData> {
  if (isVercel) return readBlob()
  return readLocal()
}

async function saveData(data: AppData) {
  if (isVercel) await writeBlob(data)
  else writeLocal(data)
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
