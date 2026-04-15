import type { AppData, User } from '@/types'
import { INITIAL_MATCHES } from '@/data/matches'
import { MongoClient } from 'mongodb'

const INITIAL_DATA: AppData = { matches: INITIAL_MATCHES, users: [], actualPosition: null }

// MongoDB connection (cached for serverless)
let client: MongoClient | null = null

async function getDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }
  return client.db('solidprono')
}

async function getCollection() {
  const db = await getDb()
  return db.collection('appdata')
}

// ---- PUBLIC API ----
export async function getData(): Promise<AppData> {
  const col = await getCollection()
  const doc = await col.findOne({ _id: 'main' as unknown as import('mongodb').ObjectId })
  if (!doc) {
    await col.insertOne({ _id: 'main' as unknown as import('mongodb').ObjectId, ...INITIAL_DATA })
    return INITIAL_DATA
  }
  const { _id, ...data } = doc
  return data as unknown as AppData
}

async function saveData(data: AppData) {
  const col = await getCollection()
  await col.replaceOne(
    { _id: 'main' as unknown as import('mongodb').ObjectId },
    data,
    { upsert: true }
  )
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
