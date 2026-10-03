import type { Lieu, Match, Odds, Result, Score, User, UserScore, MatchScore } from '@/types'

// Bon résultat : cote × 10 ; score exact : bonus en plus
export const ODDS_MULTIPLIER = 10
export const EXACT_BONUS = 20
// Points d'un bon résultat quand aucune cote n'a été saisie
export const DEFAULT_RESULT_POINTS = 10

export function isValidScore(score: unknown): score is Score {
  const s = score as Score
  return !!s && [s.home, s.away].every(g => Number.isInteger(g) && g >= 0 && g <= 20)
}

export function isValidOdds(odds: unknown): odds is Odds {
  const o = odds as Odds
  return !!o && [o.win, o.draw, o.loss].every(c => typeof c === 'number' && Number.isFinite(c) && c >= 1.01 && c <= 100)
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

// Points rapportés par un bon résultat sur ce match
export function resultPoints(match: Pick<Match, 'odds'>, result: Result): number {
  if (!match.odds) return DEFAULT_RESULT_POINTS
  const odd = result === 'V' ? match.odds.win : result === 'N' ? match.odds.draw : match.odds.loss
  return Math.round(odd * ODDS_MULTIPLIER)
}

export function scorePrediction(pred: Score | undefined, match: Match): MatchScore {
  const miss = { journee: match.journee, points: 0, resultHit: false, exactHit: false }
  if (!pred || !match.score) return miss
  const result = scoreToResult(match.score, match.lieu)
  const resultHit = scoreToResult(pred, match.lieu) === result
  const exactHit = pred.home === match.score.home && pred.away === match.score.away
  const points = resultHit ? resultPoints(match, result) + (exactHit ? EXACT_BONUS : 0) : 0
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
