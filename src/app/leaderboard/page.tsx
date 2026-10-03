'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchData } from '@/api/client'
import { calculateLeaderboard, formatScore, isValidScore, POINTS_EXACT, POINTS_RESULT } from '@/data/scoring'
import type { AppData, MatchScore, UserScore } from '@/types'

const GRID = 'grid-cols-[28px_1fr_40px_40px_40px] sm:grid-cols-[36px_1fr_56px_64px_64px_100px]'

function FormDot({ ms }: { ms: MatchScore }) {
  const base = 'w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center'
  if (ms.exactHit) return <span className={`${base} bg-raja-green ring-2 ring-raja-gold`}>{ms.points}</span>
  if (ms.resultHit) return <span className={`${base} bg-green-500`}>{ms.points}</span>
  return <span className={`${base} bg-red-500`}>0</span>
}

function PointsBadge({ ms }: { ms: MatchScore }) {
  if (ms.exactHit) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-raja-green text-white">
        Exact +{ms.points}
      </span>
    )
  }
  if (ms.resultHit) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">
        +{ms.points}
      </span>
    )
  }
  return <span className="text-[10px] px-1.5 py-0.5 font-medium text-raja-text-light/60">0</span>
}

export default function Leaderboard() {
  const [data, setData] = useState<AppData | null>(null)
  const [leaderboard, setLeaderboard] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
      .then(d => {
        setData(d)
        setLeaderboard(calculateLeaderboard(d.users, d.matches))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-raja-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const matchesPlayed = data?.matches.filter(m => m.score !== null).length ?? 0

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-20 max-w-6xl mx-auto px-4">
        <p className="text-raja-text-light text-lg">Aucun classement disponible.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-raja-dark">Classement</h1>
        <p className="text-raja-text-light text-sm mt-0.5">
          {matchesPlayed} match{matchesPlayed > 1 ? 's' : ''} joué{matchesPlayed > 1 ? 's' : ''} sur {data?.matches.length ?? 30}
        </p>
        {/* Rappel des règles */}
        <p className="text-raja-text-light text-xs mt-1">
          Bon résultat <span className="font-semibold text-green-600">+{POINTS_RESULT}</span>
          {' · '}
          Score exact <span className="font-bold text-raja-green">+{POINTS_EXACT}</span>
          {' · '}
          Pas de prono <span className="font-semibold">0</span>
        </p>
      </div>

      {/* Tableau style championnat */}
      <div className="bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
        {/* En-tête */}
        <div className="bg-raja-dark text-white text-[10px] uppercase tracking-wider font-semibold">
          <div className={`grid ${GRID} items-center gap-0 px-3 py-2.5`}>
            <span className="text-center" title="Rang">#</span>
            <span>Nom</span>
            <span className="text-center font-bold" title="Points">PTS</span>
            <span className="text-center text-raja-gold" title="Scores exacts">
              <span className="sm:hidden">EX</span>
              <span className="hidden sm:inline">Exacts</span>
            </span>
            <span className="text-center text-green-400" title="Bons résultats">
              <span className="sm:hidden">BR</span>
              <span className="hidden sm:inline">Résultats</span>
            </span>
            <span className="text-center hidden sm:block">Forme</span>
          </div>
        </div>

        {/* Lignes */}
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1
          const last5 = entry.matchScores.slice(-5)
          const isExpanded = expandedUser === entry.userId
          const isTop3 = rank <= 3
          const user = data?.users.find(u => u.id === entry.userId)

          return (
            <div key={entry.userId}>
              <button
                onClick={() => setExpandedUser(isExpanded ? null : entry.userId)}
                className={`w-full grid ${GRID} items-center gap-0 px-3 py-3 text-sm transition-colors cursor-pointer hover:bg-gray-50 ${
                  idx < leaderboard.length - 1 ? 'border-b border-raja-gray-2/50' : ''
                } ${isTop3 ? 'bg-green-50/30' : ''}`}
              >
                {/* Rang */}
                <span className={`text-center font-black text-sm ${
                  rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-raja-text-light'
                }`}>
                  {rank}
                </span>

                {/* Nom */}
                <span className={`font-semibold text-raja-dark truncate text-left ${isTop3 ? 'font-bold' : ''}`}>
                  {entry.userName}
                </span>

                {/* Points */}
                <span className={`text-center font-black ${isTop3 ? 'text-raja-green text-base' : 'text-raja-dark'}`}>
                  {entry.totalPoints}
                </span>

                {/* Scores exacts */}
                <span className="text-center font-semibold text-raja-green">{entry.exactCount}</span>

                {/* Bons résultats */}
                <span className="text-center font-semibold text-green-600">{entry.resultCount}</span>

                {/* Forme - 5 derniers */}
                <div className="hidden sm:flex items-center justify-center gap-0.5">
                  {last5.map(ms => (
                    <FormDot key={ms.journee} ms={ms} />
                  ))}
                </div>
              </button>

              {/* Détail déplié */}
              {isExpanded && (
                <div className="border-t border-raja-gray-2 bg-gray-50/80 px-4 py-3">
                  {entry.matchScores.length === 0 ? (
                    <p className="text-xs text-raja-text-light text-center py-1">Aucun match joué pour l&apos;instant.</p>
                  ) : (
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-raja-text-light px-2">
                        <span>Match</span>
                        <div className="flex items-center gap-3">
                          <span className="w-10 text-center">Prono</span>
                          <span className="w-10 text-center">Réel</span>
                          <span className="min-w-[52px] text-right">Pts</span>
                        </div>
                      </div>
                      {entry.matchScores.map(ms => {
                        const match = data?.matches.find(m => m.journee === ms.journee)
                        const raw = user?.predictions[String(ms.journee)]
                        const pred = isValidScore(raw) ? raw : undefined
                        return (
                          <Link
                            key={ms.journee}
                            href={`/match/${ms.journee}`}
                            className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded hover:bg-white transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-raja-text-light font-bold w-7 shrink-0">J{ms.journee}</span>
                              <span className="text-raja-dark truncate">{match?.adversaire}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`w-10 text-center tabular-nums ${
                                pred ? (ms.exactHit ? 'font-bold text-raja-green' : 'font-semibold text-raja-dark') : 'text-raja-text-light/60'
                              }`}>
                                {pred ? formatScore(pred) : '—'}
                              </span>
                              <span className="w-10 text-center tabular-nums text-raja-text-light">
                                {match?.score ? formatScore(match.score) : '—'}
                              </span>
                              <span className="min-w-[52px] text-right">
                                <PointsBadge ms={ms} />
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
