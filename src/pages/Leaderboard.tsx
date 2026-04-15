import { useEffect, useState } from 'react'
import { fetchData } from '../api/client'
import { calculateLeaderboard } from '../data/scoring'
import type { AppData, UserScore } from '../types'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

function Medal({ rank }: { rank: number }) {
  if (rank <= 3) {
    const config = {
      1: { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', text: 'text-white', shadow: 'shadow-yellow-200' },
      2: { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', text: 'text-white', shadow: 'shadow-gray-200' },
      3: { bg: 'bg-gradient-to-br from-amber-600 to-amber-800', text: 'text-white', shadow: 'shadow-amber-200' },
    }
    const c = config[rank as 1 | 2 | 3]
    return (
      <div className={`w-10 h-10 rounded-full ${c.bg} ${c.text} shadow-md ${c.shadow} flex items-center justify-center text-sm font-black`}>
        {rank}
      </div>
    )
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-raja-text-light">
      {rank}
    </div>
  )
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
        <p className="text-raja-text-light/60 text-sm mt-1">Les participants doivent d'abord soumettre leurs pronos.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-raja-dark">Classement</h1>
        <p className="text-raja-text-light text-sm mt-0.5">
          {matchesPlayed} match{matchesPlayed > 1 ? 's' : ''} joué{matchesPlayed > 1 ? 's' : ''} sur {data?.matches.length ?? 15}
        </p>
      </div>

      {matchesPlayed === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm mb-6">
          Aucun match joué. Le classement se met à jour après chaque résultat.
        </div>
      )}

      {/* Top 3 podium (if 3+ users) */}
      {leaderboard.length >= 3 && matchesPlayed > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
            const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3
            const isFirst = rank === 1
            return (
              <div
                key={entry.userId}
                className={`bg-white rounded-xl border text-center p-4 ${
                  isFirst
                    ? 'border-raja-gold/40 shadow-lg -mt-2 pb-6'
                    : 'border-raja-gray-2 mt-4'
                }`}
              >
                <Medal rank={rank} />
                <p className={`font-bold mt-2 ${isFirst ? 'text-lg' : 'text-sm'} text-raja-dark`}>
                  {entry.userName}
                </p>
                <p className={`font-black text-raja-green ${isFirst ? 'text-3xl' : 'text-xl'}`}>
                  {entry.totalPoints}
                </p>
                <p className="text-[10px] text-raja-text-light uppercase tracking-wide font-medium">points</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1
          const isExpanded = expandedUser === entry.userId

          return (
            <div key={entry.userId} className="bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
              <button
                onClick={() => setExpandedUser(isExpanded ? null : entry.userId)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                <Medal rank={rank} />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-raja-dark text-sm">{entry.userName}</p>
                  <p className="text-[10px] text-raja-text-light">
                    {entry.matchScores.filter(ms => ms.points > 0).length} correct
                    {entry.matchScores.filter(ms => ms.points > 0).length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right mr-2">
                  <p className="text-xl font-black text-raja-green">{entry.totalPoints}</p>
                  <p className="text-[10px] text-raja-text-light">pts</p>
                </div>
                {isExpanded ? (
                  <FaChevronUp className="w-4 h-4 text-raja-text-light" />
                ) : (
                  <FaChevronDown className="w-4 h-4 text-raja-text-light" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-raja-gray-2 px-4 py-3 bg-gray-50/50">
                  <div className="space-y-1.5">
                    {entry.matchScores.map(ms => {
                      const match = data?.matches.find(m => m.journee === ms.journee)
                      return (
                        <div key={ms.journee} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-raja-text-light font-medium w-6">J{ms.journee}</span>
                            <span className="text-raja-dark">{match?.adversaire}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {ms.realisticHit && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">R +3</span>
                            )}
                            {ms.worstHit && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">W +1</span>
                            )}
                            {ms.bestHit && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">B +1</span>
                            )}
                            <span
                              className={`font-bold ${
                                ms.points >= 3 ? 'text-green-600' : ms.points > 0 ? 'text-orange-500' : 'text-gray-300'
                              }`}
                            >
                              +{ms.points}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {entry.positionPoints > 0 && (
                      <div className="flex items-center justify-between text-xs border-t border-raja-gray-2 pt-2 mt-2">
                        <span className="text-raja-dark">Bonus classement</span>
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
