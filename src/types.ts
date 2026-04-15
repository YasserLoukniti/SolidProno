export type Result = 'V' | 'N' | 'D'

export interface Match {
  journee: number
  adversaire: string
  lieu: 'Domicile' | 'Extérieur'
  date: string
  result: Result | null
}

export interface Prediction {
  worst: Result
  realistic: Result
  best: Result
}

export interface FinalPosition {
  worst: number
  realistic: number
  best: number
}

export interface User {
  id: string
  name: string
  createdAt: string
  predictions: Record<string, Prediction>
  finalPosition: FinalPosition
}

export interface AppData {
  matches: Match[]
  users: User[]
  actualPosition: number | null
}

export interface MatchScore {
  journee: number
  points: number
  realisticHit: boolean
  worstHit: boolean
  bestHit: boolean
}

export interface UserScore {
  userId: string
  userName: string
  totalPoints: number
  matchScores: MatchScore[]
  positionPoints: number
}
