'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'
import { fetchData, fetchMe } from '@/api/client'
import { EXACT_BONUS, ODDS_MULTIPLIER, calculateLeaderboard, isValidScore, scorePrediction } from '@/data/scoring'
import { kickoffTime } from '@/data/dates'
import { parseTeams, shortName } from '@/data/teams'
import { ordinal, ptsLabel, withRanks, type RankedScore } from '@/data/ranking'
import { useIsDesktop } from '@/lib/useIsDesktop'
import type { AppData, Match, Score, User } from '@/types'

const scoreText = (s: Score) => `${s.home}-${s.away}`

function affiche(match: Match) {
  const { home, away } = parseTeams(match.adversaire)
  return `${shortName(home)} – ${shortName(away)}`
}

// Plus récent d'abord : date de coup d'envoi, à défaut numéro de journée
function byRecent(a: Match, b: Match) {
  return (kickoffTime(b.date) ?? 0) - (kickoffTime(a.date) ?? 0) || b.journee - a.journee
}

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n > 1 ? pluralForm : singular}`
}

function hitsLine(entry: RankedScore) {
  return `${plural(entry.exactCount, 'score exact', 'scores exacts')} · ${plural(entry.resultCount, 'bon résultat', 'bons résultats')}`
}

// Feuille de match d'un joueur : un prono par match joué
function PlayerHistory({ user, played }: { user: User | undefined; played: Match[] }) {
  if (played.length === 0) {
    return <p className="text-[13px] text-mist py-2">Aucun match joué pour l&apos;instant.</p>
  }
  return (
    <div>
      <div className="flex items-center gap-2 pb-1.5 text-[11px] font-semibold tracking-wide text-mist">
        <span className="w-8 shrink-0">J.</span>
        <span className="flex-1">Match</span>
        <span className="w-10 text-center">Prono</span>
        <span className="w-10 text-center">Réel</span>
        <span className="w-12 text-right">Pts</span>
      </div>
      <ul className="divide-y divide-line">
        {played.map(match => {
          const raw = user?.predictions[String(match.journee)]
          const pred = isValidScore(raw) ? raw : undefined
          const ms = scorePrediction(pred, match)
          return (
            <li key={match.journee} className="flex items-center gap-2 py-2">
              <span className="w-8 shrink-0 text-[11px] font-semibold text-mist">J{match.journee}</span>
              <span className="flex-1 min-w-0 truncate text-[13px]">{affiche(match)}</span>
              <span className={`w-10 text-center scoreboard text-lg font-bold ${pred ? (ms.exactHit ? 'text-eagle' : 'text-chalk') : 'text-mist/60'}`}>
                {pred ? scoreText(pred) : '—'}
              </span>
              <span className="w-10 text-center scoreboard text-lg font-bold text-mist">
                {match.score ? scoreText(match.score) : '—'}
              </span>
              <span className={`w-12 text-right scoreboard text-lg font-extrabold ${ms.points > 0 ? 'text-eagle' : 'text-mist/60'}`}>
                {ms.points > 0 ? `+${ms.points}` : '0'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="px-4 lg:px-6 pt-5" aria-busy="true">
      <span className="sr-only">Chargement du classement</span>
      <div className="h-9 w-44 rounded-2xl bg-pitch-2" />
      <div className="mt-2 h-4 w-64 max-w-full rounded-full bg-pitch-2" />
      <div className="mt-6 grid grid-cols-3 gap-2 items-end lg:max-w-[600px]">
        <div className="h-32 rounded-3xl bg-pitch-2" />
        <div className="h-40 rounded-3xl bg-pitch-2" />
        <div className="h-28 rounded-3xl bg-pitch-2" />
      </div>
      <div className="mt-6 space-y-2 lg:max-w-[600px]">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 rounded-2xl bg-pitch-2" />
        ))}
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState(false)
  const [me, setMe] = useState<User | null>(null)
  // Mobile : ligne dépliée ; bureau : joueur affiché dans la colonne de droite
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [meRowVisible, setMeRowVisible] = useState(true)
  const meRowRef = useRef<HTMLLIElement>(null)
  const isDesktop = useIsDesktop()

  const load = useCallback(() => {
    setError(false)
    setData(null)
    fetchData()
      .then(setData)
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    load()
    // Le joueur connecté est mis en avant quand on le connaît, sans bloquer l'affichage
    fetchMe().then(setMe).catch(() => {})
  }, [load])

  const board = useMemo(() => (data ? withRanks(calculateLeaderboard(data.users, data.matches)) : []), [data])
  const played = useMemo(() => (data ? data.matches.filter(m => m.score).sort(byRecent) : []), [data])
  const myEntry = me ? board.find(e => e.userId === me.id) : undefined

  // Rappel collant quand ma ligne sort de l'écran (mobile uniquement)
  useEffect(() => {
    const row = meRowRef.current
    if (!row || isDesktop) return
    const observer = new IntersectionObserver(([e]) => setMeRowVisible(e.isIntersecting), {
      rootMargin: '-56px 0px -130px 0px',
    })
    observer.observe(row)
    return () => observer.disconnect()
  }, [myEntry, isDesktop, played.length])

  const goToMe = () => {
    if (!myEntry) return
    if (isDesktop) setSelectedId(myEntry.userId)
    meRowRef.current?.scrollIntoView({ block: 'center' })
    meRowRef.current?.querySelector('button')?.focus({ preventScroll: true })
  }

  if (error) {
    return (
      <div className="px-4 lg:px-6 pt-5">
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Classement</h1>
        <div className="mt-6 rounded-3xl bg-pitch-2 border border-line p-5 lg:max-w-[600px]" role="alert">
          <p className="text-[15px]">Le classement n&apos;a pas pu être chargé. Vérifie ta connexion et réessaie.</p>
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

  if (!data) return <Skeleton />

  const total = data.matches.length
  const playedCount = played.length
  const usersById = new Map(data.users.map(u => [u.id, u]))
  const isEmpty = board.length === 0 || playedCount === 0

  const header = (
    <div>
      <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Classement</h1>
      <p className="mt-2 text-[13px] text-mist">
        {playedCount} {playedCount > 1 ? 'matchs joués' : 'match joué'} sur {total}
      </p>
      <p className="text-[13px] text-mist">
        Bon résultat : cote × {ODDS_MULTIPLIER} · score exact : +{EXACT_BONUS}
      </p>
    </div>
  )

  if (isEmpty) {
    return (
      <div className="px-4 lg:px-6 pt-5">
        {header}
        <div className="mt-6 rounded-3xl bg-pitch-2 border border-line p-5 lg:max-w-[600px]">
          <p className="text-[15px]">Personne n&apos;est encore classé. Les points arrivent après le premier match joué.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center min-h-11 px-5 rounded-2xl bg-raja text-white text-[15px] font-semibold hover:brightness-110 transition"
          >
            Pronostiquer le prochain match
          </Link>
        </div>
      </div>
    )
  }

  const podium = board.slice(0, 3)
  // Bureau : par défaut, le joueur connecté, sinon le premier
  const panelEntry = board.find(e => e.userId === selectedId) ?? myEntry ?? board[0]

  const onRowClick = (id: string) => {
    if (isDesktop) setSelectedId(id)
    else setSelectedId(cur => (cur === id ? null : id))
  }

  return (
    <div className={`px-4 lg:px-6 pt-5 ${myEntry ? 'pb-16 lg:pb-0' : ''}`}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
        <div>
          {header}

          {/* Podium : 2e, 1er, 3e */}
          <ol className="mt-6 grid grid-cols-3 gap-2 items-end" aria-label="Podium">
            {podium.map((entry, i) => (
              <li
                key={entry.userId}
                className={`rounded-3xl border border-line text-center px-2 ${
                  i === 0 ? 'order-2 bg-pitch-3 pt-5 pb-4' : i === 1 ? 'order-1 bg-pitch-2 pt-4 pb-3' : 'order-3 bg-pitch-2 pt-3 pb-3'
                }`}
              >
                <span className={`scoreboard block font-extrabold ${i === 0 ? 'text-6xl' : 'text-5xl'}`}>{entry.rank}</span>
                <span className="mt-2 block truncate text-[15px] font-semibold">{entry.userName}</span>
                <span className="mt-1 block">
                  <span className="scoreboard text-2xl font-extrabold text-eagle">{entry.totalPoints}</span>
                  <span className="ml-1 text-[11px] font-semibold text-mist">{ptsLabel(entry.totalPoints)}</span>
                </span>
              </li>
            ))}
          </ol>

          {/* Liste complète */}
          <ul className="mt-6 rounded-3xl bg-pitch-2 border border-line overflow-hidden divide-y divide-line">
            {board.map(entry => {
              const isMe = entry.userId === me?.id
              const expanded = !isDesktop && selectedId === entry.userId
              const selected = isDesktop && panelEntry.userId === entry.userId
              const panelId = `historique-${entry.userId}`
              return (
                <li key={entry.userId} ref={isMe ? meRowRef : undefined} className={isMe ? 'bg-pitch-3' : ''}>
                  <button
                    type="button"
                    onClick={() => onRowClick(entry.userId)}
                    {...(isDesktop
                      ? { 'aria-pressed': selected }
                      : { 'aria-expanded': expanded, 'aria-controls': panelId })}
                    className={`relative w-full min-h-14 flex items-center gap-3 pl-4 pr-3 py-2.5 text-left transition-colors hover:bg-pitch-3/70 ${
                      selected ? 'lg:bg-pitch-3 lg:shadow-[inset_0_0_0_1px_rgb(231_179_62_/_0.45)]' : ''
                    }`}
                  >
                    {isMe && <span aria-hidden className="absolute left-0 inset-y-2 w-1 rounded-r-full bg-eagle" />}
                    <span className="w-8 shrink-0 scoreboard text-2xl font-extrabold text-mist text-center">{entry.rank}</span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold">{entry.userName}</span>
                        {isMe && <span className="shrink-0 text-[11px] font-semibold tracking-wide text-eagle">Toi</span>}
                      </span>
                      <span className="block truncate text-[11px] text-mist">{hitsLine(entry)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="scoreboard text-2xl font-extrabold text-eagle">{entry.totalPoints}</span>
                      <span className="ml-1 text-[11px] font-semibold text-mist">{ptsLabel(entry.totalPoints)}</span>
                    </span>
                    <FaChevronDown
                      aria-hidden
                      className={`lg:hidden w-3 h-3 shrink-0 text-mist transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                    <FaChevronRight
                      aria-hidden
                      className={`hidden lg:block w-3 h-3 shrink-0 transition-colors ${selected ? 'text-eagle' : 'text-mist/50'}`}
                    />
                  </button>
                  {expanded && (
                    <div id={panelId} className="px-4 pb-4 pt-1 lg:hidden">
                      <PlayerHistory user={usersById.get(entry.userId)} played={played} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Bureau : détail du joueur sélectionné */}
        <aside className="hidden lg:block lg:sticky lg:top-24 space-y-3" aria-label="Détail du joueur">
          {myEntry && (
            <button
              type="button"
              onClick={goToMe}
              className="w-full min-h-12 flex items-center justify-between gap-3 px-4 rounded-2xl bg-pitch-2 border border-line hover:bg-pitch-3 hover:border-chalk/25 transition-colors"
            >
              <span className="text-[15px] font-semibold">Toi · {ordinal(myEntry.rank)}</span>
              <span>
                <span className="scoreboard text-2xl font-extrabold text-eagle">{myEntry.totalPoints}</span>
                <span className="ml-1 text-[11px] font-semibold text-mist">{ptsLabel(myEntry.totalPoints)}</span>
              </span>
            </button>
          )}
          <section className="rounded-3xl bg-pitch-2 border border-line p-5" aria-live="polite">
            <p className="text-[11px] font-semibold tracking-wide text-mist">{ordinal(panelEntry.rank)}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <h2 className="font-display text-3xl font-extrabold uppercase leading-none truncate">{panelEntry.userName}</h2>
              <span className="shrink-0">
                <span className="scoreboard text-4xl font-extrabold text-eagle">{panelEntry.totalPoints}</span>
                <span className="ml-1 text-[11px] font-semibold text-mist">{ptsLabel(panelEntry.totalPoints)}</span>
              </span>
            </div>
            <p className="mt-2 text-[13px] text-mist">{hitsLine(panelEntry)}</p>
            <div className="mt-4 max-h-[calc(100dvh-18rem)] overflow-y-auto no-scrollbar">
              <PlayerHistory user={usersById.get(panelEntry.userId)} played={played} />
            </div>
          </section>
        </aside>
      </div>

      {/* Mobile : rappel de ma place quand ma ligne est hors écran */}
      {myEntry && !meRowVisible && !isDesktop && (
        <div className="lg:hidden fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30">
          <div className="mx-auto max-w-[440px] px-4">
            <button
              type="button"
              onClick={goToMe}
              className="w-full min-h-11 flex items-center justify-between gap-3 px-4 rounded-2xl bg-pitch-3 border border-line shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            >
              <span className="text-[15px] font-semibold">
                Toi · {ordinal(myEntry.rank)} · <span className="text-eagle">{myEntry.totalPoints} {ptsLabel(myEntry.totalPoints)}</span>
              </span>
              <span className="text-[13px] text-mist">Voir</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
