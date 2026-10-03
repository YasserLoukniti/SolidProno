export type Result = 'V' | 'N' | 'D'

export type Lieu = 'Domicile' | 'Extérieur'

// Score dans l'ordre de l'affiche "domicile vs extérieur"
export interface Score {
  home: number
  away: number
}

export interface Match {
  journee: number
  adversaire: string
  lieu: Lieu
  // "YYYY-MM-DDTHH:mm" en heure marocaine, null si non programmé
  date: string | null
  // Match reporté par la Ligue ; garde sa journée, la nouvelle date est saisie dans `date`
  postponed: boolean
  score: Score | null
  // Résultat du Raja, déduit du score à l'enregistrement
  result: Result | null
}

export type Prediction = Score

export interface User {
  id: string
  name: string
  createdAt: string
  predictions: Record<string, Prediction>
}

export interface AppData {
  matches: Match[]
  users: User[]
}

export interface MatchScore {
  journee: number
  points: number
  resultHit: boolean
  exactHit: boolean
}

export interface UserScore {
  userId: string
  userName: string
  totalPoints: number
  matchScores: MatchScore[]
  exactCount: number
  resultCount: number
}
