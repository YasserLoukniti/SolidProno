import type { AppData, Match, Score, User } from '@/types'
import { isOpenForPredictions } from '@/data/dates'
import { INITIAL_MATCHES } from '@/data/matches'
import { MongoClient } from 'mongodb'

const INITIAL_DATA: AppData = { matches: INITIAL_MATCHES, users: [] }

const MAIN_ID = 'main' as unknown as import('mongodb').ObjectId

// Champs privés d'un participant, jamais renvoyés par /api/data
export type StoredUser = User & { passwordHash: string; token: string }

// MongoDB connection (cached for serverless)
let client: MongoClient | null = null

async function getDb() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }
  return client.db(process.env.MONGODB_DB || 'solidprono')
}

async function getCollection() {
  const db = await getDb()
  return db.collection('appdata')
}

// ---- PUBLIC API ----
export async function getData(): Promise<AppData> {
  const col = await getCollection()
  const doc = await col.findOne({ _id: MAIN_ID })
  if (!doc) {
    await col.insertOne({ _id: MAIN_ID, ...INITIAL_DATA })
    return INITIAL_DATA
  }
  const { _id, ...data } = doc as unknown as AppData & { _id: unknown }
  // Anciens documents : pas de champ `score`, et dates en texte libre ("À programmer")
  data.matches = data.matches.map(m => ({
    ...m,
    score: m.score ?? null,
    postponed: m.postponed ?? false,
    date: m.date && /^\d{4}-\d{2}-\d{2}/.test(m.date) ? m.date : null,
  }))
  return data
}

// Données publiques : sans champs privés, et pronostics des autres cachés jusqu'au coup d'envoi
export async function getPublicData(): Promise<AppData> {
  const data = await getData()
  const visible = new Set(data.matches.filter(m => !isOpenForPredictions(m)).map(m => String(m.journee)))
  return {
    ...data,
    users: data.users.map(u => ({
      ...toPublicUser(u),
      predictions: Object.fromEntries(Object.entries(u.predictions).filter(([journee]) => visible.has(journee))),
    })),
  }
}

export function toPublicUser(user: User): User {
  const { id, name, createdAt, predictions } = user
  return { id, name, createdAt, predictions }
}

export async function findUser(predicate: (u: StoredUser) => boolean): Promise<StoredUser | undefined> {
  const data = await getData()
  return (data.users as StoredUser[]).find(predicate)
}

// Écritures atomiques : plusieurs participants peuvent pronostiquer en même temps
export async function addUser(user: StoredUser) {
  const col = await getCollection()
  await col.updateOne({ _id: MAIN_ID }, { $push: { users: user } } as never)
}

export async function setPrediction(userId: string, journee: number, score: Score | null) {
  const col = await getCollection()
  const field = `users.$.predictions.${journee}`
  await col.updateOne(
    { _id: MAIN_ID, 'users.id': userId },
    score ? { $set: { [field]: score } } : { $unset: { [field]: '' } }
  )
}

export async function deleteUser(userId: string): Promise<boolean> {
  const col = await getCollection()
  const res = await col.updateOne({ _id: MAIN_ID }, { $pull: { users: { id: userId } } } as never)
  return res.modifiedCount > 0
}

export type MatchUpdate = Partial<Pick<Match, 'adversaire' | 'lieu' | 'date' | 'postponed' | 'score' | 'result'>>

export async function updateMatch(journee: number, update: MatchUpdate): Promise<boolean> {
  const col = await getCollection()
  const fields = Object.fromEntries(Object.entries(update).map(([key, value]) => [`matches.$.${key}`, value]))
  const res = await col.updateOne({ _id: MAIN_ID, 'matches.journee': journee }, { $set: fields })
  return res.matchedCount > 0
}
