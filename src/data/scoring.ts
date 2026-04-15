import type { Match, User, UserScore, MatchScore, Result } from '@/types'

export function calculateUserScore(user: User, matches: Match[], actualPosition: number | null): UserScore {
  const matchScores: MatchScore[] = []

  for (const match of matches) {
    if (!match.result) continue

    const pred = user.predictions[String(match.journee)]
    if (!pred) {
      matchScores.push({ journee: match.journee, points: 0, realisticHit: false, worstHit: false, bestHit: false })
      continue
    }

    const result = match.result as Result
    const realisticHit = pred.realistic === result
    const worstHit = pred.worst === result
    const bestHit = pred.best === result

    // Cumulative: realistic=3, worst=1, best=1 — all stack
    let points = 0
    if (realisticHit) points += 3
    if (worstHit) points += 1
    if (bestHit) points += 1

    matchScores.push({ journee: match.journee, points, realisticHit, worstHit, bestHit })
  }

  let positionPoints = 0
  if (actualPosition !== null) {
    const fp = user.finalPosition

    // Cumulative too: realistic + worst + best all count
    if (fp.realistic === actualPosition) positionPoints += 5
    else if (Math.abs(fp.realistic - actualPosition) === 1) positionPoints += 3
    else if (Math.abs(fp.realistic - actualPosition) === 2) positionPoints += 1

    if (fp.worst === actualPosition) positionPoints += 2
    else if (Math.abs(fp.worst - actualPosition) === 1) positionPoints += 1

    if (fp.best === actualPosition) positionPoints += 2
    else if (Math.abs(fp.best - actualPosition) === 1) positionPoints += 1
  }

  const totalPoints = matchScores.reduce((sum, ms) => sum + ms.points, 0) + positionPoints

  return {
    userId: user.id,
    userName: user.name,
    totalPoints,
    matchScores,
    positionPoints,
  }
}

export function calculateLeaderboard(users: User[], matches: Match[], actualPosition: number | null): UserScore[] {
  return users
    .map(user => calculateUserScore(user, matches, actualPosition))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}
