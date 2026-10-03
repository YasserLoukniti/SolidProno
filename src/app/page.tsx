'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaCheck, FaChevronLeft, FaChevronRight, FaLock, FaTimes } from 'react-icons/fa'
import { clearUserToken, fetchData, fetchMe, savePrediction } from '@/api/client'
import AuthForm from '@/components/AuthForm'
import KickoffCountdown from '@/components/KickoffCountdown'
import Crest from '@/components/ui/Crest'
import OutcomeTiles from '@/components/ui/OutcomeTiles'
import { formatMatchDate, isOpenForPredictions, kickoffTime, nextMatchIndex } from '@/data/dates'
import { EXACT_BONUS, resultPoints, scorePrediction, scoreToResult } from '@/data/scoring'
import { getOpponent, parseTeams, shortName } from '@/data/teams'
import type { AppData, Match, Prediction, Result, User } from '@/types'

const MATCH_STARTED = 'Le match a déjà commencé'
const UNAUTHORIZED = 'Unauthorized'
// Glissement horizontal minimal (px) pour changer de match
const SWIPE_THRESHOLD = 50
// Moins d'une heure avant le coup d'envoi : le compte à rebours passe en alerte
const IMMINENT_MS = 60 * 60 * 1000

// Saisie en cours ; null = côté pas encore touché
interface Draft {
  home: number | null
  away: number | null
}
const EMPTY_DRAFT: Draft = { home: null, away: null }

const isComplete = (d: Draft): d is Prediction => d.home !== null && d.away !== null
const sameScore = (a: Draft, b?: Prediction) => !!b && a.home === b.home && a.away === b.away
const fmt = (s: Prediction) => `${s.home}-${s.away}`

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

const RESULT_TEXT: Record<Result, string> = { V: 'text-raja-deep', N: 'text-mist', D: 'text-brick' }

type Status = 'played' | 'saved' | 'open' | 'closed'

function matchStatus(match: Match, me: User | null, now: number): Status {
  if (match.score) return 'played'
  if (me?.predictions[String(match.journee)]) return 'saved'
  return isOpenForPredictions(match, now) ? 'open' : 'closed'
}

function statusLabel(match: Match, status: Status, me: User | null): string {
  const pred = me?.predictions[String(match.journee)]
  switch (status) {
    case 'played':
      return `jouée, ${fmt(match.score!)}`
    case 'saved':
      return `prono enregistré, ${fmt(pred!)}`
    case 'open':
      return 'ouverte, pas encore de prono'
    default:
      return 'pronos fermés'
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

// useSearchParams exige une frontière Suspense (rendu côté client de l'écran)
export default function MatchesPage() {
  return (
    <Suspense fallback={<MatchesSkeleton />}>
      <MatchesScreen />
    </Suspense>
  )
}

function MatchesScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jParam = searchParams.get('j')

  const [data, setData] = useState<AppData | null>(null)
  const [me, setMe] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  // Journée choisie par l'utilisateur ; null = celle de l'URL ou le prochain match
  const [journee, setJournee] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [pending, setPending] = useState<number | null>(null)
  const [error, setError] = useState<{ journee: number; message: string } | null>(null)
  // Journée dont on veut enregistrer le prono une fois connecté (feuille d'inscription ouverte)
  const [sheetFor, setSheetFor] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // L'URL change sans démonter l'écran (lien vers /?j=N) : on suit
  const [seenParam, setSeenParam] = useState(jParam)
  if (jParam !== seenParam) {
    setSeenParam(jParam)
    const n = Number(jParam)
    if (Number.isInteger(n) && n > 0) setJournee(n)
  }

  const load = useCallback(async () => {
    try {
      const [d, u] = await Promise.all([fetchData(), fetchMe()])
      setData(d)
      setMe(u)
      setLoadError(false)
    } catch (err) {
      console.error(err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Horloge : ferme la saisie au coup d'envoi sans recharger la page
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const matches = useMemo(() => (data ? [...data.matches].sort((a, b) => a.journee - b.journee) : []), [data])

  const match =
    (journee !== null ? matches.find(m => m.journee === journee) : undefined) ??
    matches.find(m => String(m.journee) === jParam) ??
    (matches.length ? matches[nextMatchIndex(matches)] : undefined)
  const index = match ? matches.indexOf(match) : -1
  const prevMatch = index > 0 ? matches[index - 1] : undefined
  const nextMatch = index >= 0 && index < matches.length - 1 ? matches[index + 1] : undefined
  const open = match ? isOpenForPredictions(match, now) : false

  const goTo = useCallback(
    (j: number) => {
      setJournee(j)
      router.replace(`/?j=${j}`, { scroll: false })
    },
    [router]
  )

  // Coup d'envoi passé pendant qu'on regarde le match : on recharge pour dévoiler les pronos
  const openRef = useRef<{ journee: number; open: boolean } | null>(null)
  useEffect(() => {
    if (!match) return
    const prev = openRef.current
    openRef.current = { journee: match.journee, open }
    if (prev && prev.journee === match.journee && prev.open && !open) load()
  }, [match, open, load])

  // Flèches ← → du clavier (bureau)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetFor !== null || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="tablist"], [role="dialog"]')) return
      const dest = e.key === 'ArrowLeft' ? prevMatch : e.key === 'ArrowRight' ? nextMatch : undefined
      if (!dest) return
      e.preventDefault()
      goTo(dest.journee)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetFor, prevMatch, nextMatch, goTo])

  const persist = useCallback(
    async (j: number, score: Prediction | null) => {
      const key = String(j)
      setPending(j)
      setError(null)
      try {
        await savePrediction(j, score)
        setMe(prev => {
          if (!prev) return prev
          const predictions = score ? { ...prev.predictions, [key]: score } : withoutKey(prev.predictions, key)
          return { ...prev, predictions }
        })
        setDrafts(prev => withoutKey(prev, key))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement"
        if (message === UNAUTHORIZED) {
          clearUserToken()
          setMe(null)
          setError({ journee: j, message: 'Ta session a expiré : reconnecte-toi pour enregistrer ton prono.' })
          if (score) setSheetFor(j)
        } else if (message === MATCH_STARTED) {
          setError({ journee: j, message })
          setDrafts(prev => withoutKey(prev, key))
          await load()
        } else {
          setError({ journee: j, message })
        }
      } finally {
        setPending(null)
      }
    },
    [load]
  )

  if (!data) {
    if (loading) return <MatchesSkeleton />
    return (
      <LoadError
        onRetry={() => {
          setLoading(true)
          load()
        }}
      />
    )
  }

  if (!match) {
    return (
      <div className="px-4 lg:px-6 pt-6">
        <div className="rounded-3xl bg-pitch-2 px-5 py-10 text-center">
          <p className="text-[15px] font-medium">Aucun match au programme pour l&apos;instant</p>
          <p className="mt-1 text-[13px] text-mist">Reviens quand le calendrier sera publié.</p>
        </div>
      </div>
    )
  }

  const key = String(match.journee)
  const saved = me?.predictions[key]
  const draft = drafts[key] ?? saved ?? EMPTY_DRAFT

  const setDraft = (next: Draft) => {
    setDrafts(prev => ({ ...prev, [key]: next }))
    if (error?.journee === match.journee) setError(null)
  }

  const validate = () => {
    if (!isComplete(draft)) return
    if (!me) setSheetFor(match.journee)
    else persist(match.journee, { home: draft.home, away: draft.away })
  }

  const handleAuthenticated = (user: User) => {
    setMe(user)
    const j = sheetFor
    setSheetFor(null)
    if (j === null) return
    const d = drafts[String(j)]
    if (d && isComplete(d) && !sameScore(d, user.predictions[String(j)])) persist(j, { home: d.home, away: d.away })
    else setError(null)
  }

  const sheetMatch = sheetFor !== null ? matches.find(m => m.journee === sheetFor) : undefined
  const sheetDraft = sheetMatch ? drafts[String(sheetMatch.journee)] : undefined

  return (
    <div className="pt-3 lg:pt-4">
      <JourneeStrip matches={matches} selected={match.journee} me={me} now={now} onSelect={goTo} />

      <div className="px-4 lg:px-6 mt-3 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:gap-8 lg:items-start">
        <div>
          <MatchCard
            match={match}
            me={me}
            now={now}
            open={open}
            draft={draft}
            saved={saved}
            pending={pending === match.journee}
            busy={pending !== null}
            error={error?.journee === match.journee ? error.message : null}
            onDraft={setDraft}
            onValidate={validate}
            onRevert={() => setDrafts(prev => withoutKey(prev, key))}
            onRemove={() => persist(match.journee, null)}
            onSwipe={dir => {
              const dest = dir === 'prev' ? prevMatch : nextMatch
              if (dest) goTo(dest.journee)
            }}
          />

          <nav aria-label="Changer de match" className="mt-3 flex items-center justify-between gap-2">
            <StepButton dir="prev" match={prevMatch} onClick={goTo} />
            <span className="hidden lg:inline text-[11px] font-medium text-mist">
              <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> pour changer de match
            </span>
            <StepButton dir="next" match={nextMatch} onClick={goTo} />
          </nav>
        </div>

        <div className="mt-6 lg:mt-0 space-y-6">
          <OthersPredictions match={match} users={data.users} me={me} open={open} />
          <JourneeList matches={matches} selected={match.journee} me={me} now={now} onSelect={goTo} />
        </div>
      </div>

      <BottomSheet open={sheetFor !== null} onClose={() => setSheetFor(null)} title="Enregistre ton prono">
        {sheetMatch && sheetDraft && isComplete(sheetDraft) && (
          <p className="text-[13px] text-mist mb-4">
            Inscris-toi avec ton prénom pour valider ton{' '}
            <strong className="text-chalk font-semibold">
              {shortName(parseTeams(sheetMatch.adversaire).home)} {fmt(sheetDraft)}{' '}
              {shortName(parseTeams(sheetMatch.adversaire).away)}
            </strong>
            . Déjà inscrit ? Connecte-toi.
          </p>
        )}
        <AuthForm onAuthenticated={handleAuthenticated} />
      </BottomSheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Carte du match                                                      */
/* ------------------------------------------------------------------ */

interface MatchCardProps {
  match: Match
  me: User | null
  now: number
  open: boolean
  draft: Draft
  saved?: Prediction
  pending: boolean
  busy: boolean
  error: string | null
  onDraft: (d: Draft) => void
  onValidate: () => void
  onRevert: () => void
  onRemove: () => void
  onSwipe: (dir: 'prev' | 'next') => void
}

function MatchCard({
  match,
  me,
  now,
  open,
  draft,
  saved,
  pending,
  busy,
  error,
  onDraft,
  onValidate,
  onRevert,
  onRemove,
  onSwipe,
}: MatchCardProps) {
  const { home, away } = parseTeams(match.adversaire)
  const played = match.score !== null
  const postponed = match.postponed && !played
  const kickoff = kickoffTime(match.date)
  const imminent = open && kickoff !== null && kickoff - now < IMMINENT_MS

  const complete = isComplete(draft)
  const draftResult = complete ? scoreToResult(draft as Prediction, match.lieu) : null
  const dirty = complete && !sameScore(draft, saved)

  // Date sans le préfixe « Reporté » : le badge le dit déjà
  const dateLabel = postponed && !match.date ? 'Nouvelle date à venir' : formatMatchDate(match.date, false, true)

  const setSide = (side: 'home' | 'away', raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2)
    onDraft({ ...draft, [side]: digits === '' ? null : Math.min(Number(digits), 20) })
  }

  // Glissement horizontal (tactile) pour passer au match voisin
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = swipe.current
    swipe.current = null
    if (!start || start.id !== e.pointerId) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 'next' : 'prev')
  }

  const myPoints = played && saved ? scorePrediction(saved, match) : null

  return (
    <article
      aria-label={`Journée ${match.journee} : ${home} contre ${away}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
      className="bg-pitch-2 rounded-3xl px-4 sm:px-5 pt-4 pb-5 touch-pan-y select-none"
    >
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2 min-h-6">
        <span className="text-[11px] font-semibold tracking-wide uppercase text-mist">
          J{match.journee} · {match.lieu}
        </span>
        <span className="flex items-center gap-1.5">
          {postponed && (
            <span className="rounded-full bg-pitch-3 px-2.5 py-0.5 text-[11px] font-semibold text-chalk">Reporté</span>
          )}
          {played ? (
            <span className="text-[11px] font-semibold text-mist">Terminé</span>
          ) : (
            !open && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-mist">
                <FaLock className="w-2.5 h-2.5" aria-hidden="true" /> Pronos fermés
              </span>
            )
          )}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-chalk/90">{dateLabel}</p>
      {open && (
        <KickoffCountdown
          date={match.date}
          className={`mt-0.5 text-[13px] font-medium ${imminent ? 'text-brick' : 'text-mist'}`}
        />
      )}

      {/* Affiche et score sur une ligne : équipe, cases du score, équipe */}
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide team={home} />
        {played ? (
          <div className="flex flex-col items-center">
            <span className="sr-only">
              Score final : {home} {match.score!.home}, {away} {match.score!.away}
            </span>
            <span aria-hidden="true" className="scoreboard text-6xl font-extrabold">
              {match.score!.home}<span className="text-mist mx-2">-</span>{match.score!.away}
            </span>
            <span className="mt-1 text-[11px] font-semibold tracking-wide uppercase text-mist">Score final</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ScoreBox value={draft.home} onChange={v => setSide('home', v)} label={`Buts ${home}`} disabled={!open || busy} />
            <span className="text-2xl font-bold text-mist" aria-hidden="true">-</span>
            <ScoreBox value={draft.away} onChange={v => setSide('away', v)} label={`Buts ${away}`} disabled={!open || busy} />
          </div>
        )}
        <TeamSide team={away} />
      </div>

      {/* Issues et points en jeu */}
      <div className="mt-3">
        {played ? (
          <OutcomeTiles match={match} highlight={match.result} />
        ) : open ? (
          <OutcomeTiles match={match} highlight={draftResult} />
        ) : (
          <OutcomeTiles match={match} highlight={saved ? scoreToResult(saved, match.lieu) : null} />
        )}
      </div>

      {/* Bas de carte selon l'état du match */}
      {played ? (
        <div className="mt-4 text-center">
          {myPoints ? (
            <>
              <p className={`scoreboard text-4xl font-extrabold ${myPoints.points > 0 ? 'text-eagle' : 'text-mist'}`}>
                {myPoints.points > 0 ? `+${myPoints.points} pts` : '0 pt'}
                {myPoints.exactHit && <span className="font-sans text-[15px] font-semibold"> · score exact</span>}
                {myPoints.resultHit && !myPoints.exactHit && (
                  <span className="font-sans text-[15px] font-semibold"> · bon résultat</span>
                )}
              </p>
              <p className="mt-1 text-[13px] text-mist">Ton prono : {fmt(saved!)}</p>
            </>
          ) : (
            <p className="text-[13px] text-mist">Pas de prono sur ce match</p>
          )}
        </div>
      ) : !open ? (
        <p className="mt-4 text-center text-[13px] text-mist">
          {saved ? (
            <>
              Ton prono : <strong className="scoreboard text-xl text-chalk">{fmt(saved)}</strong>
            </>
          ) : (
            'Pas de prono'
          )}
        </p>
      ) : (
        <div className="mt-4">
          <p className="text-center text-[13px] text-mist min-h-5">
            {draftResult ? (
              <>
                Ce prono rapporte <strong className="text-eagle font-semibold">{resultPoints(match, draftResult)} pts</strong>,
                +{EXACT_BONUS} si score exact
              </>
            ) : (
              'Entre ton score dans les deux cases'
            )}
          </p>

          <div className="mt-3">
            {saved && !dirty ? (
              <div
                role="status"
                className="w-full min-h-12 rounded-2xl bg-pitch-3 border border-line flex items-center justify-center gap-2 text-[15px] font-semibold"
              >
                <FaCheck className="w-3.5 h-3.5 text-raja-deep" aria-hidden="true" />
                Prono enregistré · <span className="scoreboard text-xl">{fmt(saved)}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onValidate}
                disabled={!complete || busy || (!!saved && !dirty)}
                className="w-full min-h-12 rounded-2xl bg-raja text-[15px] font-semibold text-white transition-[filter,opacity] hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:hover:brightness-100 disabled:cursor-not-allowed cursor-pointer"
              >
                {pending ? 'Enregistrement…' : saved ? 'Modifier mon prono' : 'Valider mon prono'}
              </button>
            )}

            {saved && me && (
              <div className="mt-1 flex items-center justify-center gap-2">
                {dirty && (
                  <button
                    type="button"
                    onClick={onRevert}
                    disabled={busy}
                    className="min-h-11 px-3 text-[13px] text-mist hover:text-chalk underline-offset-4 hover:underline cursor-pointer disabled:opacity-40"
                  >
                    Revenir à {fmt(saved)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={busy}
                  className="min-h-11 px-3 text-[13px] text-mist hover:text-brick underline-offset-4 hover:underline cursor-pointer disabled:opacity-40"
                >
                  Retirer mon prono
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-2 text-center text-[13px] font-medium text-brick">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function StepButton({
  dir,
  match,
  onClick,
}: {
  dir: 'prev' | 'next'
  match?: Match
  onClick: (journee: number) => void
}) {
  if (!match) return <span className="w-24" aria-hidden="true" />
  const opponent = shortName(getOpponent(match.adversaire))
  return (
    <button
      type="button"
      onClick={() => onClick(match.journee)}
      aria-label={`${dir === 'prev' ? 'Match précédent' : 'Match suivant'} : journée ${match.journee} contre ${opponent}`}
      className="min-h-11 px-4 rounded-full bg-pitch-2 border border-line flex items-center gap-2 text-[13px] font-semibold text-chalk hover:bg-pitch-3 hover:border-chalk/25 transition-colors cursor-pointer"
    >
      {dir === 'prev' && <FaChevronLeft className="w-3 h-3 text-mist" aria-hidden="true" />}
      <span>
        J{match.journee}
        <span className="text-mist font-medium"> · {opponent}</span>
      </span>
      {dir === 'next' && <FaChevronRight className="w-3 h-3 text-mist" aria-hidden="true" />}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Journées : bandeau horizontal (mobile) et liste verticale (bureau)  */
/* ------------------------------------------------------------------ */

interface JourneesProps {
  matches: Match[]
  selected: number
  me: User | null
  now: number
  onSelect: (journee: number) => void
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Garde la journée affichée au centre du conteneur défilant
function useCenterSelected(selected: number, axis: 'x' | 'y') {
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    const box = ref.current
    const el = box?.querySelector<HTMLElement>(`[data-j="${selected}"]`)
    if (!box || !el || box.clientWidth === 0) return
    const behavior: ScrollBehavior = first.current || prefersReducedMotion() ? 'auto' : 'smooth'
    first.current = false
    if (axis === 'x') box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior })
    else box.scrollTo({ top: el.offsetTop - (box.clientHeight - el.offsetHeight) / 2, behavior })
  }, [selected, axis])
  return ref
}

function StatusMark({ match, status, active }: { match: Match; status: Status; active: boolean }) {
  if (status === 'played') {
    return (
      <span
        className={`scoreboard text-[13px] font-bold leading-none ${active ? 'text-white/75' : RESULT_TEXT[match.result ?? 'N']}`}
      >
        {fmt(match.score!)}
      </span>
    )
  }
  if (status === 'saved') return <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-eagle'}`} />
  if (status === 'open') return <span className={`w-1.5 h-1.5 rounded-full border ${active ? 'border-white/70' : 'border-mist/70'}`} />
  return <FaLock className={`w-2 h-2 ${active ? 'text-white/70' : 'text-mist/60'}`} aria-hidden="true" />
}

function JourneeStrip({ matches, selected, me, now, onSelect }: JourneesProps) {
  const ref = useCenterSelected(selected, 'x')
  return (
    <div
      ref={ref}
      role="group"
      aria-label="Journées"
      className="lg:hidden relative flex gap-2 overflow-x-auto no-scrollbar px-4 py-1 scroll-px-4"
    >
      {matches.map(m => {
        const active = m.journee === selected
        const status = matchStatus(m, me, now)
        return (
          <button
            key={m.journee}
            type="button"
            data-j={m.journee}
            onClick={() => onSelect(m.journee)}
            aria-current={active ? 'true' : undefined}
            aria-label={`Journée ${m.journee}, ${statusLabel(m, status, me)}`}
            className={`shrink-0 h-14 min-w-14 px-2 rounded-full border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              active ? 'bg-raja border-raja text-white' : 'bg-pitch-2 border-line text-chalk hover:bg-pitch-3'
            }`}
          >
            <span className="scoreboard text-lg font-extrabold leading-none">J{m.journee}</span>
            <StatusMark match={m} status={status} active={active} />
          </button>
        )
      })}
    </div>
  )
}

function JourneeList({ matches, selected, me, now, onSelect }: JourneesProps) {
  const ref = useCenterSelected(selected, 'y')
  return (
    <section aria-labelledby="journees-title" className="hidden lg:block">
      <h2 id="journees-title" className="px-1 mb-2 text-[13px] font-semibold text-mist">
        Toutes les journées
      </h2>
      <div ref={ref} className="relative max-h-[26rem] overflow-y-auto no-scrollbar rounded-3xl bg-pitch-2 p-1.5">
        <ul className="space-y-0.5">
          {matches.map(m => {
            const active = m.journee === selected
            const status = matchStatus(m, me, now)
            const opponent = getOpponent(m.adversaire)
            const pred = me?.predictions[String(m.journee)]
            return (
              <li key={m.journee} data-j={m.journee}>
                <button
                  type="button"
                  onClick={() => onSelect(m.journee)}
                  aria-current={active ? 'true' : undefined}
                  aria-label={`Journée ${m.journee} contre ${opponent}, ${statusLabel(m, status, me)}`}
                  className={`w-full min-h-14 px-3 rounded-2xl flex items-center gap-3 text-left transition-colors cursor-pointer ${
                    active ? 'bg-pitch-3 ring-1 ring-inset ring-eagle/70' : 'hover:bg-pitch-3/60'
                  }`}
                >
                  <span className={`scoreboard w-9 text-xl font-extrabold ${active ? 'text-eagle' : 'text-mist'}`}>
                    J{m.journee}
                  </span>
                  <Crest team={opponent} size={28} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-[15px] font-medium">
                      {shortName(opponent)}
                      <span className="text-mist font-normal"> · {m.lieu === 'Domicile' ? 'domicile' : 'extérieur'}</span>
                    </span>
                    <span className="block truncate text-[11px] text-mist">{formatMatchDate(m.date, m.postponed, true)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    {status === 'played' ? (
                      <span className={`scoreboard text-xl font-extrabold ${RESULT_TEXT[m.result ?? 'N']}`}>
                        {fmt(m.score!)}
                      </span>
                    ) : status === 'saved' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-eagle" />
                        <span className="scoreboard text-xl font-extrabold">{fmt(pred!)}</span>
                      </span>
                    ) : status === 'open' ? (
                      <span className="text-[11px] font-semibold text-mist">À pronostiquer</span>
                    ) : (
                      <FaLock className="w-3 h-3 text-mist/60" aria-hidden="true" />
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Pronos des autres                                                   */
/* ------------------------------------------------------------------ */

function OthersPredictions({ match, users, me, open }: { match: Match; users: User[]; me: User | null; open: boolean }) {
  if (open) {
    return (
      <section className="rounded-3xl border border-dashed border-line px-5 py-6 text-center">
        <FaLock className="mx-auto w-4 h-4 text-mist" aria-hidden="true" />
        <p className="mt-2 text-[15px] font-medium">Les pronos se dévoilent au coup d&apos;envoi</p>
      </section>
    )
  }

  const key = String(match.journee)
  const played = match.score !== null
  const rows = users
    .flatMap(u => {
      const pred = u.predictions[key]
      return pred ? [{ user: u, pred, points: played ? scorePrediction(pred, match) : null }] : []
    })
    .sort((a, b) => (b.points?.points ?? 0) - (a.points?.points ?? 0) || a.user.name.localeCompare(b.user.name, 'fr'))
  const withoutPred = users.filter(u => !u.predictions[key])

  return (
    <section aria-labelledby="others-title">
      <h2 id="others-title" className="px-1 mb-2 text-[13px] font-semibold text-mist">
        Les pronos · {rows.length}
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-3xl bg-pitch-2 px-5 py-6 text-center text-[13px] text-mist">Personne n&apos;a pronostiqué ce match</p>
      ) : (
        <ul className="rounded-3xl bg-pitch-2 overflow-hidden divide-y divide-line">
          {rows.map(({ user, pred, points }, i) => {
            const mine = me?.id === user.id
            const rank = points ? rows.findIndex(r => (r.points?.points ?? 0) === points.points) + 1 : null
            return (
              <li
                key={user.id}
                className={`flex items-center gap-3 px-4 min-h-14 py-2 ${mine ? 'bg-pitch-3' : ''}`}
                aria-current={mine ? 'true' : undefined}
              >
                {rank !== null && (
                  // Ex aequo : le rang n'est écrit que sur la première ligne du groupe
                  <span className="scoreboard w-6 text-lg font-bold text-mist">
                    {rank === i + 1 ? rank : ''}
                  </span>
                )}
                <span className="flex-1 min-w-0 truncate text-[15px] font-medium">
                  {user.name}
                  {mine && <span className="ml-2 text-[11px] font-semibold text-eagle">toi</span>}
                </span>
                <span className="scoreboard text-2xl font-extrabold" aria-label={`Prono ${fmt(pred)}`}>
                  {fmt(pred)}
                </span>
                {points && (
                  <span className="w-14 text-right">
                    <span className={`block scoreboard text-xl font-extrabold ${points.points > 0 ? 'text-eagle' : 'text-mist'}`}>
                      {points.points > 0 ? `+${points.points}` : '0'}
                    </span>
                    <span className="block text-[11px] text-mist">{points.exactHit ? 'exact' : 'pts'}</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {withoutPred.length > 0 && (
        <p className="mt-2 px-1 text-[13px] text-mist">
          Sans prono : {withoutPred.map(u => u.name).join(', ')}
        </p>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Feuille du bas (inscription / connexion)                            */
/* ------------------------------------------------------------------ */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const previous = document.activeElement as HTMLElement | null
    const items = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    ;(panel.querySelector<HTMLElement>('input') ?? items()[0] ?? panel).focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = items()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (!panel.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-[440px] max-h-[90dvh] overflow-y-auto bg-pitch-2 border-t border-line lg:border rounded-t-3xl lg:rounded-3xl px-5 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-6 focus:outline-none"
      >
        <div className="mx-auto mt-1 mb-2 h-1 w-10 rounded-full bg-line lg:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 id={titleId} className="text-[17px] font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 w-11 h-11 rounded-full flex items-center justify-center text-mist hover:text-chalk hover:bg-pitch-3 transition-colors cursor-pointer"
          >
            <FaTimes className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chargement et erreur                                                */
/* ------------------------------------------------------------------ */

function MatchesSkeleton() {
  return (
    <div aria-busy="true" className="pt-3 lg:pt-4">
      <span className="sr-only">Chargement des matchs</span>
      <div className="lg:hidden flex gap-2 overflow-hidden px-4 py-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="shrink-0 h-14 w-14 rounded-full bg-pitch-2" />
        ))}
      </div>
      <div className="px-4 lg:px-6 mt-3 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:gap-8">
        <div>
          <div className="rounded-3xl bg-pitch-2 h-[620px] px-5 pt-4">
            <div className="h-3 w-24 rounded-full bg-pitch-3" />
            <div className="mt-2 h-3 w-40 rounded-full bg-pitch-3" />
            <div className="mt-6 grid grid-cols-2 gap-4 justify-items-center">
              <div className="h-[72px] w-[72px] rounded-full bg-pitch-3" />
              <div className="h-[72px] w-[72px] rounded-full bg-pitch-3" />
            </div>
          </div>
          <div className="mt-3 flex justify-between">
            <div className="h-11 w-24 rounded-full bg-pitch-2" />
            <div className="h-11 w-24 rounded-full bg-pitch-2" />
          </div>
        </div>
        <div className="mt-6 lg:mt-0 space-y-6">
          <div className="h-24 rounded-3xl bg-pitch-2" />
          <div className="hidden lg:block h-96 rounded-3xl bg-pitch-2" />
        </div>
      </div>
    </div>
  )
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-4 lg:px-6 pt-6 lg:max-w-[500px]">
      <div role="alert" className="rounded-3xl bg-pitch-2 px-5 py-10 text-center">
        <p className="text-[15px] font-medium">Impossible de charger les matchs</p>
        <p className="mt-1 text-[13px] text-mist">Vérifie ta connexion puis réessaie.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 px-6 rounded-2xl bg-pitch-3 border border-line text-[15px] font-semibold hover:border-chalk/25 transition-colors cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}

function TeamSide({ team }: { team: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5 min-w-0">
      <Crest team={team} size={56} />
      <span className="text-[15px] font-bold leading-tight break-words">
        <span className="lg:hidden">{shortName(team)}</span>
        <span className="hidden lg:inline">{team}</span>
      </span>
    </div>
  )
}

// Case de score : chiffres uniquement, clavier numérique sur mobile
function ScoreBox({ value, onChange, label, disabled }: { value: number | null; onChange: (raw: string) => void; label: string; disabled: boolean }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      maxLength={2}
      aria-label={label}
      placeholder="-"
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      onFocus={e => e.target.select()}
      className="w-14 h-16 rounded-2xl border-2 border-line bg-pitch-3 text-center text-3xl font-bold text-chalk placeholder:text-mist/50 focus:border-raja focus:bg-pitch-2 focus:outline-none disabled:opacity-60 transition-colors"
    />
  )
}
