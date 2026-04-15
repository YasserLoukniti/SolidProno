'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchData } from '@/api/client'
import { calculateLeaderboard } from '@/data/scoring'
import type { AppData, UserScore } from '@/types'

function FormDot({ points }: { points: number }) {
  if (points >= 4) return <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">{points}</span>
  if (points === 3) return <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">3</span>
  if (points > 0) return <span className="w-5 h-5 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center">{points}</span>
  return <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">0</span>
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
        setLeaderboard(calculateLeaderboard(d.users, d.matches, d.actualPosition))
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

  const matchesPlayed = data?.matches.filter(m => m.result !== null).length ?? 0

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
          {matchesPlayed} match{matchesPlayed > 1 ? 's' : ''} joue{matchesPlayed > 1 ? 's' : ''} sur {data?.matches.length ?? 15}
        </p>
      </div>

      {/* Table style championnat */}
      <div className="bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
        {/* Header */}
        <div className="bg-raja-dark text-white text-[10px] uppercase tracking-wider font-semibold">
          <div className="grid grid-cols-[28px_1fr_32px_32px_32px_32px_42px] sm:grid-cols-[36px_1fr_44px_44px_44px_44px_52px_100px] items-center gap-0 px-3 py-2.5">
            <span className="text-center">#</span>
            <span>Joueur</span>
            <span className="text-center" title="Matchs joues">MJ</span>
            <span className="text-center text-green-400" title="Realiste juste">R</span>
            <span className="text-center text-amber-400" title="Worst/Best juste">W/B</span>
            <span className="text-center text-red-400" title="Aucun bon">X</span>
            <span className="text-center font-bold">PTS</span>
            <span className="text-center hidden sm:block">Forme</span>
          </div>
        </div>

        {/* Rows */}
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1
          const mj = entry.matchScores.length
          const realisticWins = entry.matchScores.filter(ms => ms.realisticHit).length
          const partialWins = entry.matchScores.filter(ms => !ms.realisticHit && ms.points > 0).length
          const losses = entry.matchScores.filter(ms => ms.points === 0).length
          const last5 = entry.matchScores.slice(-5)
          const isExpanded = expandedUser === entry.userId
          const isTop3 = rank <= 3

          return (
            <div key={entry.userId}>
              <button
                onClick={() => setExpandedUser(isExpanded ? null : entry.userId)}
                className={`w-full grid grid-cols-[28px_1fr_32px_32px_32px_32px_42px] sm:grid-cols-[36px_1fr_44px_44px_44px_44px_52px_100px] items-center gap-0 px-3 py-3 text-sm transition-colors cursor-pointer hover:bg-gray-50 ${
                  idx < leaderboard.length - 1 ? 'border-b border-raja-gray-2/50' : ''
                } ${isTop3 ? 'bg-green-50/30' : ''}`}
              >
                {/* Rank */}
                <span className={`text-center font-black text-sm ${
                  rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-raja-text-light'
                }`}>
                  {rank}
                </span>

                {/* Name */}
                <span className={`font-semibold text-raja-dark truncate text-left ${isTop3 ? 'font-bold' : ''}`}>
                  {entry.userName}
                </span>

                {/* MJ */}
                <span className="text-center text-raja-text-light">{mj}</span>

                {/* R (realistic wins) */}
                <span className="text-center font-semibold text-green-600">{realisticWins}</span>

                {/* W/B (partial wins) */}
                <span className="text-center font-semibold text-amber-600">{partialWins}</span>

                {/* X (losses) */}
                <span className="text-center font-semibold text-red-500">{losses}</span>

                {/* Points */}
                <span className={`text-center font-black ${isTop3 ? 'text-raja-green text-base' : 'text-raja-dark'}`}>
                  {entry.totalPoints}
                </span>

                {/* Form - last 5 */}
                <div className="hidden sm:flex items-center justify-center gap-0.5">
                  {last5.map((ms, i) => (
                    <FormDot key={i} points={ms.points} />
                  ))}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-raja-gray-2 bg-gray-50/80 px-4 py-3">
                  <div className="grid gap-1.5">
                    {entry.matchScores.map(ms => {
                      const match = data?.matches.find(m => m.journee === ms.journee)
                      return (
                        <Link
                          key={ms.journee}
                          href={`/match/${ms.journee}`}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-raja-text-light font-bold w-7">J{ms.journee}</span>
                            <span className="text-raja-dark">{match?.adversaire}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {ms.realisticHit && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">R +3</span>}
                            {ms.worstHit && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">W +1</span>}
                            {ms.bestHit && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">B +1</span>}
                            <span className={`font-bold min-w-[24px] text-right ${
                              ms.points >= 3 ? 'text-green-600' : ms.points > 0 ? 'text-amber-600' : 'text-red-400'
                            }`}>
                              +{ms.points}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                    {entry.positionPoints > 0 && (
                      <div className="flex items-center justify-between text-xs border-t border-raja-gray-2 pt-2 mt-1 px-2">
                        <span className="text-raja-dark font-medium">Bonus classement final</span>
                        <span className="font-bold text-raja-gold">+{entry.positionPoints}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
