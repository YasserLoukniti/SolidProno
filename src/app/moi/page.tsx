'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FaChevronRight } from 'react-icons/fa'
import AuthForm from '@/components/AuthForm'
import Crest from '@/components/ui/Crest'
import { clearUserToken, fetchData, fetchMe } from '@/api/client'
import { calculateLeaderboard, isValidScore, scorePrediction } from '@/data/scoring'
import { isOpenForPredictions, kickoffTime } from '@/data/dates'
import { getOpponent, parseTeams, shortName } from '@/data/teams'
import { ordinal, ptsLabel, withRanks } from '@/data/ranking'
import type { AppData, Match, Score, User } from '@/types'

type Phase = 'loading' | 'out' | 'in' | 'error'

const scoreText = (s: Score) => `${s.home}-${s.away}`

function affiche(match: Match) {
  const { home, away } = parseTeams(match.adversaire)
  return `${shortName(home)} – ${shortName(away)}`
}

// Un match sans date (reporté, à programmer) passe après ceux qui ont une date
const kickoffOrInfinity = (m: Match) => kickoffTime(m.date) ?? Infinity

function Skeleton() {
  return (
    <div className="px-4 lg:px-6 pt-5" aria-busy="true">
      <span className="sr-only">Chargement de ton compte</span>
      <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8">
        <div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pitch-2" />
            <div className="flex-1 space-y-2">
              <div className="h-8 w-40 rounded-2xl bg-pitch-2" />
              <div className="h-4 w-28 rounded-full bg-pitch-2" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-pitch-2" />)}
          </div>
        </div>
        <div className="mt-6 lg:mt-0 space-y-2">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-pitch-2" />)}
        </div>
      </div>
    </div>
  )
}

export default function MoiPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [me, setMe] = useState<User | null>(null)
  const [data, setData] = useState<AppData | null>(null)

  const load = useCallback(async () => {
    setPhase('loading')
    const [meRes, dataRes] = await Promise.allSettled([fetchMe(), fetchData()])
    if (dataRes.status === 'fulfilled') setData(dataRes.value)
    if (meRes.status === 'rejected') return setPhase('error')
    setMe(meRes.value)
    if (!meRes.value) return setPhase('out')
    setPhase(dataRes.status === 'fulfilled' ? 'in' : 'error')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onAuthenticated = (user: User) => {
    setMe(user)
    if (data) setPhase('in')
    else load()
  }

  const logout = () => {
    clearUserToken()
    setMe(null)
    setPhase('out')
    window.scrollTo(0, 0)
  }

  const view = useMemo(() => {
    if (!me || !data) return null
    // Mon prono complet (fetchMe) remplace la version publique, qui cache les matchs pas encore commencés
    const users = data.users.some(u => u.id === me.id)
      ? data.users.map(u => (u.id === me.id ? me : u))
      : [...data.users, me]
    const board = withRanks(calculateLeaderboard(users, data.matches))
    const entry = board.find(e => e.userId === me.id)!
    const playedCount = data.matches.filter(m => m.score).length

    const myPredictions = data.matches
      .flatMap(match => {
        const raw = me.predictions[String(match.journee)]
        return isValidScore(raw) ? [{ match, pred: raw }] : []
      })
      .sort((a, b) => kickoffOrInfinity(b.match) - kickoffOrInfinity(a.match) || b.match.journee - a.match.journee)

    const openWithout = data.matches
      .filter(m => isOpenForPredictions(m) && !isValidScore(me.predictions[String(m.journee)]))
      .sort((a, b) => kickoffOrInfinity(a) - kickoffOrInfinity(b) || a.journee - b.journee)

    return { entry, playerCount: board.length, playedCount, myPredictions, openWithout }
  }, [me, data])

  if (phase === 'loading') return <Skeleton />

  if (phase === 'error') {
    return (
      <div className="px-4 lg:px-6 pt-5">
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Ton compte</h1>
        <div className="mt-6 rounded-3xl bg-pitch-2 border border-line p-5 lg:max-w-md" role="alert">
          <p className="text-[15px]">Ton compte n&apos;a pas pu être chargé. Vérifie ta connexion et réessaie.</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 min-h-11 px-5 rounded-2xl bg-pitch-3 border border-line text-[15px] font-semibold hover:border-chalk/30 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'out' || !me || !view) {
    return (
      <div className="px-4 lg:px-6 pt-5 lg:pt-10 lg:max-w-md lg:mx-auto">
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Ton compte</h1>
        <p className="mt-2 text-[13px] text-mist">Inscris-toi avec ton prénom pour pronostiquer, ou connecte-toi si tu as déjà un compte.</p>
        <div className="mt-6">
          <AuthForm onAuthenticated={onAuthenticated} />
        </div>
        <div className="mt-8 text-center">
          <Link href="/admin" className="inline-flex items-center min-h-11 px-3 text-[13px] text-mist/50 hover:text-mist transition-colors">
            Espace admin
          </Link>
        </div>
      </div>
    )
  }

  const { entry, playerCount, playedCount, myPredictions, openWithout } = view
  const firstOpen = openWithout[0]

  const footer = (className: string) => (
    <div className={`flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={logout}
        className="min-h-11 px-5 rounded-2xl border border-line text-[15px] text-mist hover:text-chalk hover:border-chalk/30 transition-colors"
      >
        Me déconnecter
      </button>
      <Link href="/admin" className="inline-flex items-center min-h-11 px-3 text-[13px] text-mist/50 hover:text-mist transition-colors">
        Espace admin
      </Link>
    </div>
  )

  return (
    <div className="px-4 lg:px-6 pt-5">
      <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8 lg:items-start">
        {/* Profil et stats */}
        <div className="lg:sticky lg:top-24">
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="w-16 h-16 shrink-0 rounded-full bg-pitch-3 border border-line flex items-center justify-center font-display text-4xl font-extrabold uppercase"
            >
              {me.name.trim().charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-extrabold uppercase leading-none truncate">{me.name}</h1>
              <p className="mt-1.5 text-[13px] text-mist">
                {playedCount === 0 ? (
                  'Pas encore de match joué'
                ) : (
                  <>
                    {ordinal(entry.rank)} sur {playerCount} ·{' '}
                    <span className="text-eagle font-semibold">
                      {entry.totalPoints} {ptsLabel(entry.totalPoints)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2">
            {[
              { label: 'Points', value: entry.totalPoints, gold: true },
              { label: 'Scores exacts', value: entry.exactCount, gold: false },
              { label: 'Bons résultats', value: entry.resultCount, gold: false },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl bg-pitch-2 border border-line px-2 py-3 text-center flex flex-col-reverse">
                <dt className="mt-1 text-[11px] font-semibold text-mist">{stat.label}</dt>
                <dd className={`scoreboard text-4xl font-extrabold ${stat.gold ? 'text-eagle' : 'text-chalk'}`}>{stat.value}</dd>
              </div>
            ))}
          </dl>

          {firstOpen && (
            <Link
              href={`/?j=${firstOpen.journee}`}
              className="mt-4 flex items-center gap-3 rounded-3xl bg-pitch-2 border border-line px-4 py-3.5 min-h-14 hover:bg-pitch-3 hover:border-chalk/25 transition-colors group"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold">
                  {openWithout.length} {openWithout.length > 1 ? 'matchs ouverts sans prono' : 'match ouvert sans prono'}
                </span>
                <span className="block truncate text-[13px] text-mist">
                  Prochain : J{firstOpen.journee} · {affiche(firstOpen)}
                </span>
              </span>
              <span className="hidden lg:inline shrink-0 text-[13px] font-semibold text-raja-deep group-hover:underline">Pronostiquer</span>
              <FaChevronRight aria-hidden className="w-3 h-3 shrink-0 text-raja-deep" />
            </Link>
          )}

          {footer('hidden lg:flex mt-8')}
        </div>

        {/* Mes pronos */}
        <section className="mt-8 lg:mt-0" aria-labelledby="mes-pronos">
          <h2 id="mes-pronos" className="font-display text-2xl font-extrabold uppercase leading-none">Mes pronos</h2>

          {myPredictions.length === 0 ? (
            <div className="mt-3 rounded-3xl bg-pitch-2 border border-line p-5">
              <p className="text-[15px]">Tu n&apos;as encore aucun prono.</p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center min-h-11 px-5 rounded-2xl bg-raja text-white text-[15px] font-semibold hover:brightness-110 transition"
              >
                Pronostiquer le prochain match
              </Link>
            </div>
          ) : (
            <ul className="mt-3 rounded-3xl bg-pitch-2 border border-line overflow-hidden divide-y divide-line">
              {myPredictions.map(({ match, pred }) => {
                const open = isOpenForPredictions(match)
                const ms = scorePrediction(pred, match)
                const content = (
                  <>
                    <Crest team={getOpponent(match.adversaire)} size={32} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-[11px] font-semibold text-mist">J{match.journee}</span>
                        <span className="truncate text-[15px] font-semibold">{affiche(match)}</span>
                        {match.postponed && (
                          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-mist">
                            Reporté
                          </span>
                        )}
                      </span>
                      <span className="block text-[13px] leading-snug text-mist">
                        {match.score ? (
                          <>
                            Score réel <span className="scoreboard text-base font-bold text-chalk">{scoreText(match.score)}</span>
                          </>
                        ) : open ? (
                          <span className="text-raja-deep">Modifiable jusqu&apos;au coup d&apos;envoi</span>
                        ) : (
                          'En attente'
                        )}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 scoreboard text-3xl font-extrabold ${ms.exactHit ? 'text-eagle' : 'text-chalk'}`}
                      aria-label={`Ton prono ${pred.home} à ${pred.away}`}
                    >
                      {scoreText(pred)}
                    </span>
                    {match.score ? (
                      <span className={`w-11 shrink-0 text-right scoreboard text-2xl font-extrabold ${ms.points > 0 ? 'text-eagle' : 'text-mist/60'}`}>
                        {ms.points > 0 ? `+${ms.points}` : '0'}
                      </span>
                    ) : open ? (
                      <FaChevronRight aria-hidden className="w-3 h-3 shrink-0 text-mist group-hover:text-chalk transition-colors" />
                    ) : null}
                  </>
                )
                const rowClass = 'flex items-center gap-3 px-4 py-3 min-h-16'
                return (
                  <li key={match.journee}>
                    {open ? (
                      <Link href={`/?j=${match.journee}`} className={`${rowClass} group hover:bg-pitch-3 transition-colors`}>
                        {content}
                      </Link>
                    ) : (
                      <div className={rowClass}>{content}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {footer('flex lg:hidden mt-8')}
    </div>
  )
}
