import { NextResponse } from 'next/server'
import { getData } from '@/lib/storage'
import { MongoClient } from 'mongodb'
import type { Prediction } from '@/types'

// One-time migration: fix Raja schedule journées 22-28 in MongoDB
// Old order: J22=Kawkab, J23=UTS, J24=Zemamra, J25=CODM, J26=Yacoub, J27=Tanger, J28=Berkane
// New order: J22=Berkane, J23=Kawkab, J24=UTS, J25=Zemamra, J26=CODM, J27=Yacoub, J28=Tanger

const CORRECT_MATCHES: Record<number, { adversaire: string; lieu: 'Domicile' | 'Extérieur' }> = {
  22: { adversaire: "Raja Club Athletic vs RS Berkane", lieu: "Domicile" },
  23: { adversaire: "Kawkab Marrakech vs Raja Club Athletic", lieu: "Extérieur" },
  24: { adversaire: "Raja Club Athletic vs UTS Rabat", lieu: "Domicile" },
  25: { adversaire: "Renaissance Zemamra vs Raja Club Athletic", lieu: "Extérieur" },
  26: { adversaire: "Raja Club Athletic vs CODM Meknès", lieu: "Domicile" },
  27: { adversaire: "Yacoub El Mansour vs Raja Club Athletic", lieu: "Extérieur" },
  28: { adversaire: "Ittihad Tanger vs Raja Club Athletic", lieu: "Extérieur" },
}

// Prediction remapping: old journée key → new journée key
// (predictions follow the match, not the journée number)
const PRED_REMAP: Record<string, string> = {
  "22": "23",
  "23": "24",
  "24": "25",
  "25": "26",
  "26": "27",
  "27": "28",
  "28": "22",
}

export async function POST() {
  const uri = process.env.MONGODB_URI
  if (!uri) return NextResponse.json({ error: 'MONGODB_URI not set' }, { status: 500 })

  const data = await getData()

  // 1. Fix matches
  for (const match of data.matches) {
    if (CORRECT_MATCHES[match.journee]) {
      match.adversaire = CORRECT_MATCHES[match.journee].adversaire
      match.lieu = CORRECT_MATCHES[match.journee].lieu
    }
  }

  // 2. Remap user predictions (predictions follow the match, not the journée number)
  for (const user of data.users) {
    const preds = user.predictions
    const saved: Record<string, Prediction> = {}
    for (const oldKey of Object.keys(PRED_REMAP)) {
      if (preds[oldKey]) saved[oldKey] = preds[oldKey]
    }
    for (const [oldKey, newKey] of Object.entries(PRED_REMAP)) {
      if (saved[oldKey]) {
        preds[newKey] = saved[oldKey]
      }
    }
  }

  // 3. Save to MongoDB
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const col = client.db('solidprono').collection('appdata')
    await col.replaceOne(
      { _id: 'main' as unknown as import('mongodb').ObjectId },
      data,
      { upsert: true }
    )
  } finally {
    await client.close()
  }

  return NextResponse.json({
    success: true,
    message: 'Migration terminée : calendrier corrigé et prédictions remappées',
    matchesFixed: Object.keys(CORRECT_MATCHES).map(Number),
    usersUpdated: data.users.map(u => u.name),
  })
}
