import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchData } from '../api/client'
import type { AppData, Result } from '../types'
import { FaArrowLeft } from 'react-icons/fa'
import { getMatchLogos, parseTeams } from '../data/teams'

function ScenarioBadge({ label, shortLabel, value, isMatch }: { label: string; shortLabel: string; value: Result | undefined; isMatch: boolean }) {
  if (!value) return null
  const colors = {
    V: isMatch ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700',
    N: isMatch ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700',
    D: isMatch ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700',
  }
  const labelColors = { W: 'text-red-400', R: 'text-raja-green', B: 'text-raja-gold' }
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isMatch ? 'bg-green-50/50' : ''}`}>
      <span className={`text-xs font-bold w-3 ${labelColors[shortLabel as keyof typeof labelColors]}`}>{shortLabel}</span>
      <span className="text-xs text-raja-text-light flex-1">{label}</span>
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[value]}`}>{value}</span>
      {isMatch && <span className="text-green-600 text-[10px] font-semibold">Correct</span>}
    </div>
  )
}

export default function MatchDetail() {
  const { journee } = useParams<{ journee: string }>()
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
      .then(setData)
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

  const match = data?.matches.find(m => m.journee === Number(journee))
  if (!match) {
    return (
      <div className="text-center py-20 max-w-6xl mx-auto px-4">
        <p className="text-raja-text-light">Match introuvable</p>
        <Link to="/predictions" className="text-raja-green hover:underline mt-2 inline-block text-sm">
          Retour
        </Link>
      </div>
    )
  }

  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <Link to="/predictions" className="inline-flex items-center gap-1.5 text-raja-text-light text-sm hover:text-raja-green mb-4">
        <FaArrowLeft className="w-4 h-4" />
        Retour
      </Link>

      {/* Match hero */}
      <div className="gradient-hero rounded-2xl p-6 mb-6">
        <div className="text-center">
          <span className="text-raja-gold text-[10px] font-semibold uppercase tracking-widest">
            Journée {match.journee} &middot; {match.lieu} &middot; Botola Pro
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 mt-4">
          <div className="flex-1 text-center">
            {homeLogo ? (
              <img src={homeLogo} alt={home} className="w-16 h-16 mx-auto mb-2 object-contain" />
            ) : (
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white/70 text-xs font-bold">{home}</span>
              </div>
            )}
            <p className="text-white font-bold text-sm">{home}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            {match.result ? (
              <span
                className={`text-2xl font-black px-5 py-2 rounded-xl ${
                  match.result === 'V'
                    ? 'bg-green-600 text-white'
                    : match.result === 'N'
                    ? 'bg-orange-500 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {match.result === 'V' ? 'Victoire' : match.result === 'N' ? 'Nul' : 'Défaite'}
              </span>
            ) : (
              <span className="text-3xl font-black text-white/20">VS</span>
            )}
            <span className="text-white/40 text-xs">{match.date}</span>
          </div>

          <div className="flex-1 text-center">
            {awayLogo ? (
              <img src={awayLogo} alt={away} className="w-16 h-16 mx-auto mb-2 object-contain" />
            ) : (
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white/70 text-xs font-bold">{away}</span>
              </div>
            )}
            <p className="text-white font-bold text-sm">{away}</p>
          </div>
        </div>
      </div>

      {/* User predictions */}
      {data && data.users.length > 0 ? (
        <div>
          <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">
            Pronostics ({data.users.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.users.map(user => {
              const pred = user.predictions[String(match.journee)]
              const hasCorrect =
                match.result &&
                pred &&
                (pred.realistic === match.result || pred.worst === match.result || pred.best === match.result)

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-xl border overflow-hidden ${
                    hasCorrect ? 'border-green-200' : match.result ? 'border-red-100' : 'border-raja-gray-2'
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-raja-gray-2/50">
                    <h3 className="font-semibold text-sm text-raja-dark">{user.name}</h3>
                    {match.result && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          pred?.realistic === match.result
                            ? 'bg-green-100 text-green-700'
                            : hasCorrect
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-50 text-red-500'
                        }`}
                      >
                        {pred?.realistic === match.result
                          ? '+3 pts'
                          : hasCorrect
                          ? '+1 pt'
                          : '0 pt'}
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <ScenarioBadge shortLabel="W" label="Pire" value={pred?.worst} isMatch={match.result !== null && pred?.worst === match.result} />
                    <ScenarioBadge shortLabel="R" label="Réaliste" value={pred?.realistic} isMatch={match.result !== null && pred?.realistic === match.result} />
                    <ScenarioBadge shortLabel="B" label="Meilleur" value={pred?.best} isMatch={match.result !== null && pred?.best === match.result} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-raja-text-light text-center py-8 text-sm">Aucun pronostic pour ce match.</p>
      )}
    </div>
  )
}
