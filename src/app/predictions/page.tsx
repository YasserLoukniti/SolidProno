'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { fetchData } from '@/api/client'
import type { AppData, MatchScore, Score } from '@/types'
import { getMatchLogos, parseTeams } from '@/data/teams'
import { formatScore, isValidScore, scorePrediction } from '@/data/scoring'
import TeamLogo from '@/components/TeamLogo'
import { nextMatchIndex } from '@/data/dates'

// Score pronostiqué, mis en valeur selon le résultat (ms absent = match pas encore joué)
function ScoreBox({ score, ms }: { score: Score; ms?: MatchScore }) {
  const cls = !ms
    ? 'bg-raja-gray text-raja-dark border border-raja-gray-2'
    : ms.exactHit
      ? 'bg-raja-green text-white'
      : ms.resultHit
        ? 'bg-green-50 text-green-700 border border-green-200'
        : 'bg-red-50 text-red-700 border border-red-200'
  return (
    <span className={`inline-block min-w-[52px] text-center px-2 py-1 rounded-lg text-sm font-bold tabular-nums ${cls}`}>
      {formatScore(score)}
    </span>
  )
}

function PointsLabel({ ms }: { ms: MatchScore }) {
  if (ms.exactHit) return <span className="text-[10px] font-bold text-raja-green">Score exact +{ms.points}</span>
  if (ms.resultHit) return <span className="text-[10px] font-medium text-green-600">Bon résultat +{ms.points}</span>
  return <span className="text-[10px] font-medium text-red-400">0 pt</span>
}

function borderFor(ms?: MatchScore) {
  if (!ms) return 'border-raja-gray-2'
  if (ms.exactHit) return 'border-raja-green'
  if (ms.resultHit) return 'border-green-200'
  return 'border-red-100'
}

export default function Predictions() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchIdx, setMatchIdx] = useState(0)
  const [viewMode, setViewMode] = useState<'match' | 'user'>('match')
  const [selectedUser, setSelectedUser] = useState(0)

  useEffect(() => {
    fetchData()
      .then(d => {
        setData(d)
        // Commence au prochain match par date
        setMatchIdx(nextMatchIndex(d.matches))
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

  if (!data || data.users.length === 0) {
    return (
      <div className="text-center py-20 max-w-6xl mx-auto px-4">
        <p className="text-raja-text-light text-lg mb-4">Aucun pronostic soumis pour l'instant.</p>
        <Link href="/submit" className="text-raja-green font-semibold hover:underline">
          Sois le premier !
        </Link>
      </div>
    )
  }

  const match = data.matches[matchIdx]
  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)
  const user = data.users[selectedUser]

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-raja-dark">Pronostics</h1>
          <p className="text-raja-text-light text-sm mt-0.5">
            {data.users.length} participant{data.users.length > 1 ? 's' : ''}
          </p>
        </div>
        {/* View mode toggle */}
        <div className="flex bg-raja-gray rounded-lg p-0.5 border border-raja-gray-2">
          <button
            onClick={() => setViewMode('match')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'match' ? 'bg-white text-raja-dark shadow-sm' : 'text-raja-text-light'
            }`}
          >
            Par match
          </button>
          <button
            onClick={() => setViewMode('user')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'user' ? 'bg-white text-raja-dark shadow-sm' : 'text-raja-text-light'
            }`}
          >
            Par joueur
          </button>
        </div>
      </div>

      {viewMode === 'match' ? (
        /* ===== VIEW: PAR MATCH ===== */
        <div>
          {/* Match navigator */}
          <div className="bg-raja-dark rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setMatchIdx(i => Math.max(0, i - 1))}
                disabled={matchIdx === 0}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
              <div className="text-center">
                <p className="text-white/40 text-[10px] uppercase tracking-widest">
                  Journée {match.journee} &middot; {match.lieu}
                </p>
              </div>
              <button
                onClick={() => setMatchIdx(i => Math.min(data.matches.length - 1, i + 1))}
                disabled={matchIdx === data.matches.length - 1}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1 mb-4">
              {data.matches.map((m, i) => (
                <button
                  key={m.journee}
                  onClick={() => setMatchIdx(i)}
                  className={`h-1 rounded-full transition-all cursor-pointer ${
                    i === matchIdx ? 'w-4 bg-raja-gold' : m.score ? 'w-1.5 bg-white/30' : 'w-1.5 bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-center">
                {homeLogo && <TeamLogo logo={homeLogo} name={home} size="w-12 h-12" />}
                <p className="text-white font-bold text-xs">{home}</p>
              </div>
              <div className="text-center">
                {match.score ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-black text-white tabular-nums">{formatScore(match.score)}</span>
                    {match.result && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        match.result === 'V' ? 'bg-green-600 text-white'
                        : match.result === 'N' ? 'bg-orange-500 text-white'
                        : 'bg-red-600 text-white'
                      }`}>
                        {match.result === 'V' ? 'Victoire' : match.result === 'N' ? 'Nul' : 'Défaite'}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xl font-black text-white/15">VS</span>
                )}
              </div>
              <div className="flex-1 text-center">
                {awayLogo && <TeamLogo logo={awayLogo} name={away} size="w-12 h-12" />}
                <p className="text-white font-bold text-xs">{away}</p>
              </div>
            </div>
          </div>

          {/* All users' predictions for this match */}
          <div className="space-y-2">
            {data.users.map(u => {
              const pred = u.predictions[String(match.journee)]
              if (!isValidScore(pred)) return null
              const ms = match.score ? scorePrediction(pred, match) : undefined

              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-4 ${borderFor(ms)}`}
                >
                  {/* Nom */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-raja-dark truncate">{u.name}</p>
                    {ms && <PointsLabel ms={ms} />}
                  </div>

                  {/* Score pronostiqué */}
                  <ScoreBox score={pred} ms={ms} />
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ===== VIEW: PAR JOUEUR ===== */
        <div>
          {/* User selector */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4">
            {data.users.map((u, i) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  i === selectedUser
                    ? 'bg-raja-green text-white'
                    : 'bg-white text-raja-text-light border border-raja-gray-2 hover:border-raja-green'
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>

          {/* User's predictions for all matches */}
          <div className="space-y-2">
            {data.matches.map(m => {
              const pred = user.predictions[String(m.journee)]
              if (!isValidScore(pred)) return null
              const { home: mHome, away: mAway } = parseTeams(m.adversaire)
              const logos = getMatchLogos(m.adversaire)
              const ms = m.score ? scorePrediction(pred, m) : undefined

              return (
                <Link
                  key={m.journee}
                  href={`/match/${m.journee}`}
                  className={`block bg-white rounded-xl border px-4 py-3 hover:shadow-sm transition-all ${borderFor(ms)}`}
                >
                  {/* En-tête du match */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-raja-text-light">J{m.journee}</span>
                    <span className={`text-[10px] font-semibold ${
                      m.lieu === 'Domicile' ? 'text-raja-green' : 'text-raja-text-light'
                    }`}>{m.lieu}</span>
                    {ms && <span className="ml-auto"><PointsLabel ms={ms} /></span>}
                  </div>

                  {/* Équipes + prono / score réel */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {logos.homeLogo && <TeamLogo logo={logos.homeLogo} name={mHome} size="w-6 h-6" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-raja-dark truncate">{mHome}</p>
                        <p className="text-xs font-medium text-raja-dark truncate">{mAway}</p>
                      </div>
                      {logos.awayLogo && <TeamLogo logo={logos.awayLogo} name={mAway} size="w-6 h-6" />}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <p className="text-[8px] text-raja-text-light uppercase tracking-wider mb-0.5">Prono</p>
                        <ScoreBox score={pred} ms={ms} />
                      </div>
                      {m.score && (
                        <div className="text-center">
                          <p className="text-[8px] text-raja-text-light uppercase tracking-wider mb-0.5">Réel</p>
                          <span className="inline-block min-w-[52px] text-center px-2 py-1 rounded-lg text-sm font-bold tabular-nums bg-raja-dark text-white">
                            {formatScore(m.score)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
