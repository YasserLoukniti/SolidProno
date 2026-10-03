import type { Lieu, Match, Result, Score, User, UserScore, MatchScore } from '@/types'

export const POINTS_RESULT = 3
export const POINTS_EXACT = 5

export function isValidScore(score: unknown): score is Score {
  const s = score as Score
  return !!s && [s.home, s.away].every(g => Number.isInteger(g) && g >= 0 && g <= 20)
}

// Résultat du point de vue du Raja
export function scoreToResult(score: Score, lieu: Lieu): Result {
  const raja = lieu === 'Domicile' ? score.home : score.away
  const adv = lieu === 'Domicile' ? score.away : score.home
  return raja > adv ? 'V' : raja === adv ? 'N' : 'D'
}

export function formatScore(score: Score): string {
  return `${score.home} - ${score.away}`
}

export function scorePrediction(pred: Score | undefined, match: Match): MatchScore {
  const miss = { journee: match.journee, points: 0, resultHit: false, exactHit: false }
  if (!pred || !match.score) return miss
  const exactHit = pred.home === match.score.home && pred.away === match.score.away
  const resultHit = scoreToResult(pred, match.lieu) === scoreToResult(match.score, match.lieu)
  const points = exactHit ? POINTS_EXACT : resultHit ? POINTS_RESULT : 0
  return { journee: match.journee, points, resultHit, exactHit }
}

export function calculateUserScore(user: User, matches: Match[]): UserScore {
  const matchScores = matches
    .filter(m => m.score)
    .map(m => scorePrediction(user.predictions[String(m.journee)], m))

  return {
    userId: user.id,
    userName: user.name,
    totalPoints: matchScores.reduce((sum, ms) => sum + ms.points, 0),
    matchScores,
    exactCount: matchScores.filter(ms => ms.exactHit).length,
    resultCount: matchScores.filter(ms => ms.resultHit).length,
  }
}

export function calculateLeaderboard(users: User[], matches: Match[]): UserScore[] {
  return users
    .map(user => calculateUserScore(user, matches))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.exactCount - a.exactCount)
}
