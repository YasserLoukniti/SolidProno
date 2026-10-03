'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchData, fetchMe } from '@/api/client'
import type { AppData, Result, User } from '@/types'
import { FaArrowLeft } from 'react-icons/fa'
import { getMatchLogos, parseTeams } from '@/data/teams'
import TeamLogo from '@/components/TeamLogo'
import HiddenPredictions from '@/components/HiddenPredictions'
import { formatMatchDate, isOpenForPredictions } from '@/data/dates'
import { EXACT_BONUS, ODDS_MULTIPLIER, formatScore, scorePrediction } from '@/data/scoring'
import OddsPills, { formatPoints } from '@/components/OddsPills'

const RESULT_LABEL: Record<Result, string> = { V: 'Victoire', N: 'Nul', D: 'Défaite' }
const RESULT_BG: Record<Result, string> = { V: 'bg-green-600', N: 'bg-orange-500', D: 'bg-red-600' }

export default function MatchDetail() {
  const params = useParams<{ journee: string }>()
  const journee = params.journee
  const [data, setData] = useState<AppData | null>(null)
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
    // En parallèle et sans bloquer l'affichage : le participant connecté voit son propre prono
    fetchMe().then(setMe).catch(console.error)
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
        <Link href="/predictions" className="text-raja-green hover:underline mt-2 inline-block text-sm">
          Retour
        </Link>
      </div>
    )
  }

  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)
  const isPlayed = match.score !== null && match.result !== null
  // Tant que le match est ouvert, les pronos des autres sont cachés (absents des données publiques)
  const isOpen = isOpenForPredictions(match)
  const isPostponed = match.postponed && !isPlayed

  // Match fermé : pronostic et points de chaque participant ; tri par points si le match est joué
  const entries = (data?.users ?? [])
    .map(user => {
      const pred = user.predictions[String(match.journee)]
      return { user, pred, ms: scorePrediction(pred, match) }
    })
    .sort((a, b) =>
      (isPlayed ? b.ms.points - a.ms.points : 0) ||
      Number(!!b.pred) - Number(!!a.pred) ||
      a.user.name.localeCompare(b.user.name)
    )

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <Link href="/predictions" className="inline-flex items-center gap-1.5 text-raja-text-light text-sm hover:text-raja-green mb-4">
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
            <div className="mb-2"><TeamLogo logo={homeLogo} name={home} /></div>
            <p className="text-white font-bold text-sm">{home}</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            {match.score && match.result ? (
              <>
                <span className="text-5xl font-black text-white tabular-nums leading-none whitespace-nowrap">
                  {formatScore(match.score)}
                </span>
                <span className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full text-white ${RESULT_BG[match.result]}`}>
                  {RESULT_LABEL[match.result]}
                </span>
              </>
            ) : (
              <span className="text-3xl font-black text-white/20">VS</span>
            )}
            {isPostponed && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-raja-orange text-raja-dark">
                Reporté
              </span>
            )}
            <span className={`text-xs text-center ${isPostponed ? 'text-raja-orange font-semibold' : 'text-white/40'}`}>
              {formatMatchDate(match.date, match.postponed, true)}
            </span>
            {!isPlayed && !isOpen && (
              <span className="text-raja-gold text-[10px] font-semibold uppercase tracking-widest">En cours</span>
            )}
          </div>

          <div className="flex-1 text-center">
            <div className="mb-2"><TeamLogo logo={awayLogo} name={away} /></div>
            <p className="text-white font-bold text-sm">{away}</p>
          </div>
        </div>

        {/* Points en jeu (match joué : le résultat final est mis en avant) */}
        <div className="mt-5 max-w-md mx-auto">
          <OddsPills match={match} highlight={match.result} variant="dark" />
          <p className="mt-2 text-center text-[10px] text-white/40">
            Bon résultat : cote × {ODDS_MULTIPLIER} · Score exact : +{EXACT_BONUS} en plus
          </p>
        </div>
      </div>

      {/* User predictions : cachés tant que le match est ouvert */}
      {isOpen ? (
        <div>
          <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">Pronostics</h2>
          <HiddenPredictions journee={match.journee} me={me} />
        </div>
      ) : entries.length > 0 ? (
        <div>
          <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">
            Pronostics ({entries.filter(e => e.pred).length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {entries.map(({ user, pred, ms }) => {
              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-xl border overflow-hidden flex items-center gap-3 px-4 py-3 ${
                    !isPlayed
                      ? 'border-raja-gray-2'
                      : ms.exactHit
                      ? 'border-raja-gold ring-2 ring-raja-gold/30 bg-amber-50/40'
                      : ms.resultHit
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-raja-gray-2 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-raja-dark truncate">{user.name}</h3>
                    {isPlayed && pred && (
                      <span className={`text-[11px] font-semibold ${
                        ms.exactHit ? 'text-amber-600' : ms.resultHit ? 'text-green-600' : 'text-raja-text-light'
                      }`}>
                        {ms.exactHit ? 'Score exact' : ms.resultHit ? 'Bon résultat' : 'Raté'}
                      </span>
                    )}
                  </div>

                  {pred ? (
                    <span
                      className={`text-lg font-black tabular-nums whitespace-nowrap px-3 py-1 rounded-lg ${
                        !isPlayed
                          ? 'bg-raja-dark text-white'
                          : ms.exactHit
                          ? 'bg-raja-gold text-raja-dark'
                          : ms.resultHit
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-raja-text-light'
                      }`}
                    >
                      {formatScore(pred)}
                    </span>
                  ) : (
                    <span className="text-xs text-raja-text-light italic whitespace-nowrap">Pas de prono</span>
                  )}

                  {isPlayed && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                        ms.exactHit
                          ? 'bg-raja-gold text-raja-dark'
                          : ms.resultHit
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-raja-text-light'
                      }`}
                    >
                      {formatPoints(ms.points)} pt{ms.points > 1 ? 's' : ''}
                    </span>
                  )}
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
