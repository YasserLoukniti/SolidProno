'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { clearUserToken, fetchData, fetchMe, login, register, savePrediction } from '@/api/client'
import MatchCard, { type MatchCardStatus } from '@/components/MatchCard'
import TeamLogo from '@/components/TeamLogo'
import type { Match, Prediction, User } from '@/types'
import { POINTS_RESULT, POINTS_EXACT, calculateUserScore, formatScore, scorePrediction } from '@/data/scoring'
import { formatMatchDate, isOpenForPredictions, kickoffTime } from '@/data/dates'
import { getMatchLogos, parseTeams } from '@/data/teams'
import {
  FaCheckCircle,
  FaChevronDown,
  FaExclamationTriangle,
  FaLock,
  FaSignOutAlt,
  FaTrashAlt,
  FaUndo,
} from 'react-icons/fa'

const MATCH_STARTED = 'Le match a déjà commencé'
const UNAUTHORIZED = 'Unauthorized'

const sameScore = (a?: Prediction, b?: Prediction) => !!a && !!b && a.home === b.home && a.away === b.away

// Ordre chronologique ; les matchs sans date (reportés ou à programmer) à la fin, par journée
function byKickoff(a: Match, b: Match): number {
  const ka = kickoffTime(a.date)
  const kb = kickoffTime(b.date)
  if (ka !== null && kb !== null) return ka - kb || a.journee - b.journee
  if (ka !== null) return -1
  if (kb !== null) return 1
  return a.journee - b.journee
}

// Plus récent d'abord ; les matchs sans date à la fin
function byKickoffDesc(a: Match, b: Match): number {
  const ka = kickoffTime(a.date)
  const kb = kickoffTime(b.date)
  if (ka !== null && kb !== null) return kb - ka || b.journee - a.journee
  if (ka !== null) return -1
  if (kb !== null) return 1
  return b.journee - a.journee
}

function Rules() {
  return (
    <div className="bg-white rounded-xl border border-raja-gray-2 px-4 py-3 text-center">
      <p className="text-sm text-raja-text-light">
        Bon résultat : <strong className="text-green-600">+{POINTS_RESULT} pts</strong>
        <span className="mx-2 text-raja-gray-2">·</span>
        Score exact : <strong className="text-raja-gold">+{POINTS_EXACT} pts</strong>
      </p>
      <p className="text-[10px] text-raja-text-light mt-1">
        Non cumulable : un score exact rapporte {POINTS_EXACT} pts au total. Pas de prono = 0 pt.
        Modifiable jusqu&apos;au coup d&apos;envoi.
      </p>
    </div>
  )
}

function Spinner({ className = 'w-8 h-8 border-3 border-raja-green' }: { className?: string }) {
  return <div className={`${className} border-t-transparent rounded-full animate-spin`} />
}

/* ------------------------------------------------------------------ */
/* Inscription / connexion                                             */
/* ------------------------------------------------------------------ */

function AuthCard({ onAuthenticated, notice }: { onAuthenticated: (user: User) => void; notice?: string }) {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = name.trim().length >= 2 && /^\d{4}$/.test(pin) && !submitting

  const switchMode = (next: 'register' | 'login') => {
    setMode(next)
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const user = await (mode === 'register' ? register : login)(name.trim(), pin)
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setSubmitting(false)
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
      active ? 'bg-white text-raja-green shadow-sm' : 'text-raja-text-light hover:text-raja-dark'
    }`

  return (
    <div className="max-w-md mx-auto space-y-4">
      {notice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
          {notice}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-raja-gray-2 p-4 sm:p-6">
        <div className="flex gap-1 p-1 bg-raja-gray rounded-xl mb-5" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchMode('register')} className={tabClass(mode === 'register')}>
            Je m&apos;inscris
          </button>
          <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')} className={tabClass(mode === 'login')}>
            J&apos;ai déjà un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-name" className="block text-xs font-semibold text-raja-dark mb-1.5">
              Prénom
            </label>
            <input
              id="auth-name"
              type="text"
              autoComplete="username"
              autoCapitalize="words"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ton prénom"
              maxLength={30}
              className="w-full px-3 py-3 rounded-lg border border-raja-gray-2 bg-white focus:border-raja-green focus:outline-none text-base font-medium"
            />
          </div>

          <div>
            <label htmlFor="auth-pin" className="block text-xs font-semibold text-raja-dark mb-1.5">
              Code à 4 chiffres
            </label>
            <input
              id="auth-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="w-full px-3 py-3 rounded-lg border border-raja-gray-2 bg-white focus:border-raja-green focus:outline-none text-base font-bold tracking-[0.5em]"
            />
            <p className="text-[11px] text-raja-text-light mt-1.5">
              {mode === 'register'
                ? 'Choisis un code et retiens-le : il te servira à te reconnecter sur un autre téléphone.'
                : "Le code choisi à l'inscription, pour retrouver tes pronos sur cet appareil."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-raja-green text-white py-3.5 rounded-xl text-base font-bold hover:bg-raja-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? '...' : mode === 'register' ? "M'inscrire" : 'Me connecter'}
          </button>
        </form>
      </div>

      <Rules />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Carte d'un match ouvert                                             */
/* ------------------------------------------------------------------ */

interface OpenMatchProps {
  match: Match
  saved?: Prediction
  draft?: Prediction
  pending: boolean
  error?: string
  onChange: (p: Prediction) => void
  onSave: () => void
  onRemove: () => void
  onReset: () => void
}

function OpenMatchCard({ match, saved, draft, pending, error, onChange, onSave, onRemove, onReset }: OpenMatchProps) {
  const shown = draft ?? saved
  const dirty = !!draft && !sameScore(draft, saved)
  const status: MatchCardStatus = dirty ? 'dirty' : saved ? 'saved' : 'empty'

  return (
    <div>
      <MatchCard match={match} prediction={shown} onChange={onChange} readOnly={pending} status={status}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs">
            {dirty ? (
              <p className="text-raja-gold font-semibold">
                {saved ? <>Modifié · enregistré : {formatScore(saved)}</> : 'Pas encore enregistré'}
              </p>
            ) : saved ? (
              <p className="flex items-center gap-1.5 text-raja-green font-semibold">
                <FaCheckCircle className="w-3.5 h-3.5 shrink-0" />
                Enregistré : {formatScore(saved)}
              </p>
            ) : (
              <p className="text-raja-text-light">Pas de prono</p>
            )}
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || pending}
            className="shrink-0 min-w-[7.5rem] flex items-center justify-center gap-2 bg-raja-green text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-raja-green-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {pending ? <><Spinner className="w-3.5 h-3.5 border-2 border-white" /> Envoi…</> : 'Enregistrer'}
          </button>
        </div>

        {saved && !pending && (
          <div className="flex items-center gap-4 mt-2">
            {dirty && saved && (
              <button type="button" onClick={onReset} className="flex items-center gap-1 text-xs text-raja-text-light hover:text-raja-dark cursor-pointer">
                <FaUndo className="w-2.5 h-2.5" /> Annuler la modif
              </button>
            )}
            {saved && (
              <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-red-600 hover:underline cursor-pointer">
                <FaTrashAlt className="w-2.5 h-2.5" /> Retirer mon prono
              </button>
            )}
          </div>
        )}
      </MatchCard>

      {error && (
        <p className="mt-1.5 px-1 flex items-start gap-1.5 text-xs text-red-600 font-medium">
          <FaExclamationTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ligne d'un match commencé ou joué (lecture seule)                   */
/* ------------------------------------------------------------------ */

function ClosedMatchRow({ match, prediction }: { match: Match; prediction?: Prediction }) {
  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)
  const ms = scorePrediction(prediction, match)

  const pointsBadge = !match.score ? (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-raja-gray text-raja-text-light">En attente</span>
  ) : ms.exactHit ? (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-raja-gold/15 text-raja-gold">+{ms.points} · exact</span>
  ) : ms.resultHit ? (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">+{ms.points} · résultat</span>
  ) : (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-raja-gray text-raja-text-light">0 pt</span>
  )

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-raja-text-light">
          J{match.journee} · <span className="normal-case font-medium">{formatMatchDate(match.date, match.postponed)}</span>
        </span>
        {pointsBadge}
      </div>
      <div className="flex items-center gap-2 text-sm">
        {homeLogo && <TeamLogo logo={homeLogo} name={home} size="w-5 h-5" />}
        <span className="font-semibold text-raja-dark truncate">{home}</span>
        <span className="font-black tabular-nums text-raja-dark shrink-0">
          {match.score ? formatScore(match.score) : '–'}
        </span>
        <span className="font-semibold text-raja-dark truncate">{away}</span>
        {awayLogo && <TeamLogo logo={awayLogo} name={away} size="w-5 h-5" />}
      </div>
      <p className="text-xs mt-1 text-raja-text-light">
        Ton prono :{' '}
        {prediction ? (
          <strong className="text-raja-dark tabular-nums">{formatScore(prediction)}</strong>
        ) : (
          <span className="italic">Pas de prono</span>
        )}
      </p>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Page « Mes pronos »                                                 */
/* ------------------------------------------------------------------ */

export default function MyPredictions() {
  const [matches, setMatches] = useState<Match[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [authNotice, setAuthNotice] = useState('')

  // Saisies non enregistrées, par journée
  const [drafts, setDrafts] = useState<Record<string, Prediction>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showClosed, setShowClosed] = useState(false)

  const load = useCallback(async () => {
    try {
      const [data, me] = await Promise.all([fetchData(), fetchMe()])
      setMatches(data.matches)
      setUser(me)
      setLoadError('')
    } catch (err) {
      console.error(err)
      setLoadError('Impossible de charger les matchs. Réessaie dans un instant.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAuthenticated = (u: User) => {
    setUser(u)
    setDrafts({})
    setErrors({})
    setAuthNotice('')
    setNotice('')
  }

  const logout = () => {
    clearUserToken()
    setUser(null)
    setDrafts({})
    setErrors({})
    setPending({})
    setNotice('')
  }

  const setKey = <T,>(setter: (fn: (prev: Record<string, T>) => Record<string, T>) => void, key: string, value: T | undefined) =>
    setter(prev => {
      const next = { ...prev }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })

  const persist = async (match: Match, score: Prediction | null) => {
    const key = String(match.journee)
    setKey(setPending, key, true)
    setKey(setErrors, key, undefined)
    try {
      await savePrediction(match.journee, score)
      setUser(prev => {
        if (!prev) return prev
        const predictions = { ...prev.predictions }
        if (score) predictions[key] = score
        else delete predictions[key]
        return { ...prev, predictions }
      })
      setKey(setDrafts, key, undefined)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement"
      if (message === UNAUTHORIZED) {
        clearUserToken()
        setUser(null)
        setAuthNotice('Ta session a expiré : reconnecte-toi avec ton prénom et ton code.')
      } else if (message === MATCH_STARTED) {
        setKey(setDrafts, key, undefined)
        setNotice(`J${match.journee} — ${match.adversaire} a déjà commencé : ce prono n'a pas pu être pris en compte.`)
        await load()
      } else {
        setKey(setErrors, key, message)
      }
    } finally {
      setKey(setPending, key, undefined)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  const now = Date.now()
  const openMatches = matches.filter(m => isOpenForPredictions(m, now)).sort(byKickoff)
  const closedMatches = matches.filter(m => !isOpenForPredictions(m, now)).sort(byKickoffDesc)

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-raja-dark">Mes pronos</h1>
        <p className="text-raja-text-light text-sm mt-1">
          Pronostique le score exact de chaque match, quand tu veux, jusqu&apos;au coup d&apos;envoi.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button type="button" onClick={() => load()} className="shrink-0 underline font-semibold cursor-pointer">
            Réessayer
          </button>
        </div>
      )}

      {!user ? (
        <AuthCard onAuthenticated={handleAuthenticated} notice={authNotice} />
      ) : (
        <>
          {/* En-tête participant */}
          <div className="gradient-hero rounded-2xl p-5 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-raja-gold text-[10px] font-semibold uppercase tracking-widest">Botola Pro 2026-27</p>
                <h2 className="text-white text-xl font-bold truncate mt-0.5">Salut {user.name}</h2>
              </div>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <FaSignOutAlt className="w-3 h-3" /> Se déconnecter
              </button>
            </div>
            <div className="flex items-end gap-6 mt-4">
              <div>
                <p className="text-white text-2xl font-black tabular-nums leading-none">
                  {openMatches.filter(m => user.predictions[String(m.journee)]).length}
                  <span className="text-white/50 text-base font-bold"> / {openMatches.length}</span>
                </p>
                <p className="text-white/60 text-[11px] mt-1">pronos sur matchs ouverts</p>
              </div>
              <div>
                <p className="text-white text-2xl font-black tabular-nums leading-none">
                  {calculateUserScore(user, matches).totalPoints}
                  <span className="text-white/50 text-base font-bold"> pts</span>
                </p>
                <p className="text-white/60 text-[11px] mt-1">au total</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <Rules />
          </div>

          {notice && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-start justify-between gap-3">
              <span className="flex items-start gap-2">
                <FaLock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {notice}
              </span>
              <button type="button" onClick={() => setNotice('')} aria-label="Fermer" className="shrink-0 font-bold cursor-pointer">
                ×
              </button>
            </div>
          )}

          {/* Matchs ouverts */}
          {openMatches.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openMatches.map(match => {
                const key = String(match.journee)
                const saved = user.predictions[key]
                return (
                  <OpenMatchCard
                    key={key}
                    match={match}
                    saved={saved}
                    draft={drafts[key]}
                    pending={!!pending[key]}
                    error={errors[key]}
                    onChange={p => {
                      setKey(setDrafts, key, p)
                      setKey(setErrors, key, undefined)
                    }}
                    onSave={() => {
                      const draft = drafts[key]
                      if (draft) persist(match, draft)
                    }}
                    onRemove={() => persist(match, null)}
                    onReset={() => setKey(setDrafts, key, undefined)}
                  />
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-raja-text-light bg-white rounded-xl border border-raja-gray-2">
              <FaLock className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun match ouvert aux pronostics pour le moment.</p>
            </div>
          )}

          {/* Matchs commencés ou joués */}
          {closedMatches.length > 0 && (
            <div className="mt-6 bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowClosed(v => !v)}
                aria-expanded={showClosed}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-raja-gray/60 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-raja-dark">
                  <FaLock className="w-3 h-3 text-raja-text-light" />
                  Matchs commencés ou joués
                  <span className="text-raja-text-light font-medium">({closedMatches.length})</span>
                </span>
                <FaChevronDown className={`w-3 h-3 text-raja-text-light transition-transform ${showClosed ? 'rotate-180' : ''}`} />
              </button>
              {showClosed && (
                <ul className="divide-y divide-raja-gray-2 border-t border-raja-gray-2">
                  {closedMatches.map(match => (
                    <ClosedMatchRow key={match.journee} match={match} prediction={user.predictions[String(match.journee)]} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
