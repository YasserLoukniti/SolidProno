import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { fetchData } from '../api/client'
import type { AppData, Result } from '../types'
import { getMatchLogos, parseTeams } from '../data/teams'

function Badge({ value, highlight }: { value: Result; highlight?: boolean }) {
  const cls = {
    V: highlight ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200',
    N: highlight ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200',
    D: highlight ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 border border-red-200',
  }
  return <span className={`inline-block w-7 text-center py-0.5 rounded text-[10px] font-bold ${cls[value]}`}>{value}</span>
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
        // Start at first unplayed match
        const first = d.matches.findIndex(m => m.result === null)
        if (first >= 0) setMatchIdx(first)
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
        <Link to="/submit" className="text-raja-green font-semibold hover:underline">
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
                  Journee {match.journee} &middot; {match.lieu}
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
                    i === matchIdx ? 'w-4 bg-raja-gold' : m.result ? 'w-1.5 bg-white/30' : 'w-1.5 bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-center">
                {homeLogo && <img src={homeLogo} alt={home} className="w-12 h-12 mx-auto mb-1 object-contain" />}
                <p className="text-white font-bold text-xs">{home}</p>
              </div>
              <div className="text-center">
                {match.result ? (
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                    match.result === 'V' ? 'bg-green-600 text-white'
                    : match.result === 'N' ? 'bg-orange-500 text-white'
                    : 'bg-red-600 text-white'
                  }`}>
                    {match.result === 'V' ? 'Victoire' : match.result === 'N' ? 'Nul' : 'Defaite'}
                  </span>
                ) : (
                  <span className="text-xl font-black text-white/15">VS</span>
                )}
              </div>
              <div className="flex-1 text-center">
                {awayLogo && <img src={awayLogo} alt={away} className="w-12 h-12 mx-auto mb-1 object-contain" />}
                <p className="text-white font-bold text-xs">{away}</p>
              </div>
            </div>
          </div>

          {/* All users' predictions for this match */}
          <div className="space-y-2">
            {data.users.map(u => {
              const pred = u.predictions[String(match.journee)]
              if (!pred) return null
              const rHit = match.result && pred.realistic === match.result
              const wHit = match.result && pred.worst === match.result
              const bHit = match.result && pred.best === match.result
              const pts = (rHit ? 3 : 0) + (wHit ? 1 : 0) + (bHit ? 1 : 0)
              const hasAny = pts > 0

              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-4 ${
                    match.result
                      ? hasAny ? 'border-green-200' : 'border-red-100'
                      : 'border-raja-gray-2'
                  }`}
                >
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-raja-dark truncate">{u.name}</p>
                    {match.result && (
                      <p className={`text-[10px] font-medium ${
                        pts >= 3 ? 'text-green-600' : pts > 0 ? 'text-orange-500' : 'text-red-400'
                      }`}>
                        +{pts} pt{pts > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* 3 scenarios */}
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[9px] text-raja-text-light font-medium mb-0.5">W</p>
                      <Badge value={pred.worst} highlight={match.result !== null && pred.worst === match.result} />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-raja-green font-medium mb-0.5">R</p>
                      <Badge value={pred.realistic} highlight={match.result !== null && pred.realistic === match.result} />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-raja-gold font-medium mb-0.5">B</p>
                      <Badge value={pred.best} highlight={match.result !== null && pred.best === match.result} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Final position section */}
          <div className="mt-6 bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
            <div className="bg-raja-dark px-4 py-2.5">
              <p className="text-white font-bold text-xs">Classement final predit</p>
              {data.actualPosition && (
                <p className="text-white/50 text-[10px]">Position reelle: {data.actualPosition}e</p>
              )}
            </div>
            <div className="divide-y divide-raja-gray-2/50">
              {data.users.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-medium text-raja-dark">{u.name}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-red-400">W: {u.finalPosition.worst}e</span>
                    <span className="text-raja-green font-bold">R: {u.finalPosition.realistic}e</span>
                    <span className="text-raja-gold">B: {u.finalPosition.best}e</span>
                  </div>
                </div>
              ))}
            </div>
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
              if (!pred) return null
              const { home: mHome, away: mAway } = parseTeams(m.adversaire)
              const logos = getMatchLogos(m.adversaire)
              const rH = m.result && pred.realistic === m.result
              const wH = m.result && pred.worst === m.result
              const bH = m.result && pred.best === m.result
              const p = (rH ? 3 : 0) + (wH ? 1 : 0) + (bH ? 1 : 0)

              return (
                <Link
                  key={m.journee}
                  to={`/match/${m.journee}`}
                  className={`block bg-white rounded-xl border px-4 py-3 hover:shadow-sm transition-all ${
                    m.result
                      ? p > 0 ? 'border-green-200' : 'border-red-100'
                      : 'border-raja-gray-2'
                  }`}
                >
                  {/* Match header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-raja-text-light">J{m.journee}</span>
                    <span className={`text-[10px] font-semibold ${
                      m.lieu === 'Domicile' ? 'text-raja-green' : 'text-raja-text-light'
                    }`}>{m.lieu}</span>
                    {m.result && (
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        m.result === 'V' ? 'bg-green-100 text-green-700'
                        : m.result === 'N' ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                        {m.result === 'V' ? 'Victoire' : m.result === 'N' ? 'Nul' : 'Defaite'}
                      </span>
                    )}
                    {m.result && (
                      <span className={`text-[10px] font-bold ${
                        p >= 3 ? 'text-green-600' : p > 0 ? 'text-orange-500' : 'text-red-400'
                      }`}>
                        +{p}
                      </span>
                    )}
                  </div>

                  {/* Teams + predictions */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {logos.homeLogo && <img src={logos.homeLogo} alt="" className="w-6 h-6 object-contain" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-raja-dark truncate">{mHome}</p>
                        <p className="text-xs font-medium text-raja-dark truncate">{mAway}</p>
                      </div>
                      {logos.awayLogo && <img src={logos.awayLogo} alt="" className="w-6 h-6 object-contain" />}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-center">
                        <p className="text-[8px] text-raja-text-light mb-0.5">W</p>
                        <Badge value={pred.worst} highlight={m.result !== null && pred.worst === m.result} />
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] text-raja-green mb-0.5">R</p>
                        <Badge value={pred.realistic} highlight={m.result !== null && pred.realistic === m.result} />
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] text-raja-gold mb-0.5">B</p>
                        <Badge value={pred.best} highlight={m.result !== null && pred.best === m.result} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Final position */}
            <div className="bg-white rounded-xl border border-raja-gold/30 px-4 py-3 mt-2">
              <p className="text-xs font-bold text-raja-dark mb-2">Classement final</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-red-400">Pire: {user.finalPosition.worst}e</span>
                <span className="text-raja-green font-bold">Realiste: {user.finalPosition.realistic}e</span>
                <span className="text-raja-gold">Meilleur: {user.finalPosition.best}e</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
