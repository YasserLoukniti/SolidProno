'use client'

import { useState } from 'react'
import type { Lieu, Match, Odds, Result, Score } from '@/types'
import { OPPONENTS, RAJA, buildAdversaire, getOpponent, getTeamLogo, isFlipped } from '@/data/teams'
import { formatMatchDate, kickoffTime, parseMatchDate } from '@/data/dates'
import { DEFAULT_RESULT_POINTS, EXACT_BONUS, ODDS_MULTIPLIER, isValidOdds } from '@/data/scoring'
import { FaCheck, FaLock, FaUndo } from 'react-icons/fa'

export type MatchEdit = Pick<Match, 'adversaire' | 'lieu' | 'date' | 'postponed'>

interface Props {
  match: Match
  onSave: (journee: number, edit: MatchEdit) => Promise<void>
  onSetScore: (journee: number, score: Score | null) => Promise<void>
  // Renvoie le message d'erreur à afficher dans la ligne, ou null si l'enregistrement a réussi
  onSetOdds: (journee: number, odds: Odds | null) => Promise<string | null>
}

export function TeamBadge({ name, size = 'w-9 h-9' }: { name: string; size?: string }) {
  const logo = getTeamLogo(name)
  if (!logo) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
    return (
      <div className={`${size} shrink-0 rounded-full bg-raja-dark-3 flex items-center justify-center`}>
        <span className="text-white text-[10px] font-bold">{initials}</span>
      </div>
    )
  }
  return (
    <img
      src={logo}
      alt={name}
      className={`${size} shrink-0 object-contain ${isFlipped(name) ? 'rotate-180' : ''}`}
    />
  )
}

const RESULT_STYLES: Record<Result, { label: string; className: string }> = {
  V: { label: 'Victoire', className: 'bg-green-600 text-white' },
  N: { label: 'Nul', className: 'bg-orange-500 text-white' },
  D: { label: 'Défaite', className: 'bg-red-600 text-white' },
}

const goalsInput = (value: string) => value.replace(/\D/g, '').slice(0, 2)

type OddsInputs = Record<keyof Odds, string>

const ODDS_FIELDS: { key: keyof Odds; label: string }[] = [
  { key: 'win', label: 'Victoire Raja' },
  { key: 'draw', label: 'Nul' },
  { key: 'loss', label: 'Défaite Raja' },
]

// Saisie décimale : chiffres et un seul séparateur (virgule ou point), deux décimales max
const oddInput = (value: string) => {
  const cleaned = value.replace(/[^\d.,]/g, '')
  const sep = cleaned.match(/[.,]/)?.[0]
  const [int, ...rest] = cleaned.split(/[.,]/)
  return sep ? `${int.slice(0, 3)}${sep}${rest.join('').slice(0, 2)}` : int.slice(0, 3)
}

// "1,70" ou "1.70" → 1.7 ; NaN si vide ou illisible
const parseOdd = (value: string) => (value.trim() ? Number(value.replace(',', '.')) : NaN)

const formatOdd = (odd: number) => odd.toFixed(2).replace('.', ',')

const toOddsInputs = (odds: Odds | null): OddsInputs =>
  odds
    ? { win: formatOdd(odds.win), draw: formatOdd(odds.draw), loss: formatOdd(odds.loss) }
    : { win: '', draw: '', loss: '' }

const isValidOdd = (odd: number) => isValidOdds({ win: odd, draw: odd, loss: odd })

export default function AdminMatchRow({ match, onSave, onSetScore, onSetOdds }: Props) {
  const initial = parseMatchDate(match.date)
  const [opponent, setOpponent] = useState(getOpponent(match.adversaire))
  const [lieu, setLieu] = useState<Lieu>(match.lieu)
  const [day, setDay] = useState(initial.day)
  const [time, setTime] = useState(initial.time)
  const [postponed, setPostponed] = useState(match.postponed)
  const [saving, setSaving] = useState(false)
  const [homeGoals, setHomeGoals] = useState(match.score ? String(match.score.home) : '')
  const [awayGoals, setAwayGoals] = useState(match.score ? String(match.score.away) : '')

  const [oddsInputs, setOddsInputs] = useState<OddsInputs>(() => toOddsInputs(match.odds))
  const [savingOdds, setSavingOdds] = useState(false)
  const [oddsError, setOddsError] = useState('')

  // Le serveur refuse de modifier des cotes déjà saisies une fois le coup d'envoi passé
  const kickoff = kickoffTime(match.date)
  const kickoffPassed = kickoff !== null && Date.now() >= kickoff
  const oddsFrozen = match.odds !== null && kickoffPassed
  const shownOdds = oddsFrozen ? toOddsInputs(match.odds) : oddsInputs
  const parsedOdds: Odds = {
    win: parseOdd(shownOdds.win),
    draw: parseOdd(shownOdds.draw),
    loss: parseOdd(shownOdds.loss),
  }
  const oddsValid = isValidOdds(parsedOdds)
  const savedOdds = match.odds
  const oddsDirty =
    !oddsFrozen &&
    (savedOdds
      ? ODDS_FIELDS.some(f => parsedOdds[f.key] !== savedOdds[f.key])
      : ODDS_FIELDS.some(f => oddsInputs[f.key] !== ''))

  const changeOdd = (key: keyof Odds, value: string) => {
    setOddsInputs(prev => ({ ...prev, [key]: oddInput(value) }))
    setOddsError('')
  }

  const resetOdds = () => {
    setOddsInputs(toOddsInputs(match.odds))
    setOddsError('')
  }

  const saveOdds = async (odds: Odds | null) => {
    setSavingOdds(true)
    setOddsError('')
    try {
      const error = await onSetOdds(match.journee, odds)
      if (error) setOddsError(error)
      else setOddsInputs(toOddsInputs(odds))
    } finally {
      setSavingOdds(false)
    }
  }

  const scoreComplete = homeGoals !== '' && awayGoals !== ''
  const scoreDirty = scoreComplete && (!match.score || Number(homeGoals) !== match.score.home || Number(awayGoals) !== match.score.away)

  const date = day ? (time ? `${day}T${time}` : day) : null
  const dirty =
    opponent !== getOpponent(match.adversaire) ||
    lieu !== match.lieu ||
    postponed !== match.postponed ||
    date !== (initial.day ? match.date : null)

  const reset = () => {
    setOpponent(getOpponent(match.adversaire))
    setLieu(match.lieu)
    setDay(initial.day)
    setTime(initial.time)
    setPostponed(match.postponed)
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(match.journee, { adversaire: buildAdversaire(opponent, lieu), lieu, date, postponed })
    } finally {
      setSaving(false)
    }
  }

  const home = lieu === 'Domicile' ? RAJA : opponent
  const away = lieu === 'Domicile' ? opponent : RAJA
  const status = match.result ? 'Joué' : match.postponed ? 'Reporté' : match.date ? 'Programmé' : 'À programmer'

  return (
    <div
      className={`bg-white rounded-xl border p-3 sm:p-4 transition-colors ${
        dirty || oddsDirty ? 'border-raja-gold ring-1 ring-raja-gold/40' : match.result ? 'border-green-200' : 'border-raja-gray-2'
      }`}
    >
      {/* Header: journée, statut, affiche */}
      <div className="flex items-center gap-3">
        <div className="w-10 shrink-0 text-center">
          <p className="text-[10px] font-semibold text-raja-text-light uppercase">Journée</p>
          <p className="text-lg font-black text-raja-dark leading-none">{match.journee}</p>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 sm:gap-3">
          <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
            <span className="text-sm font-semibold text-raja-dark truncate text-right">{home}</span>
            <TeamBadge name={home} />
          </div>
          <span className="text-[10px] font-bold text-raja-text-light">VS</span>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <TeamBadge name={away} />
            <span className="text-sm font-semibold text-raja-dark truncate">{away}</span>
          </div>
        </div>

        <span
          className={`hidden sm:inline-block shrink-0 text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${
            match.result
              ? 'bg-green-50 text-green-700'
              : match.postponed
              ? 'bg-orange-50 text-orange-700'
              : match.date
              ? 'bg-blue-50 text-blue-700'
              : 'bg-raja-gray text-raja-text-light'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Edition */}
      <div className="mt-3 pt-3 border-t border-raja-gray-2 grid grid-cols-2 lg:grid-cols-[1.4fr_auto_1fr_0.7fr_auto_auto] gap-2 items-end">
        <label className="col-span-2 lg:col-span-1 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-raja-text-light uppercase">Adversaire</span>
          <select
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            className="px-2 py-2 rounded-lg border border-raja-gray-2 bg-white text-sm focus:border-raja-green focus:outline-none"
          >
            {!OPPONENTS.includes(opponent) && <option value={opponent}>{opponent}</option>}
            {OPPONENTS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <div className="col-span-2 lg:col-span-1 flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-raja-text-light uppercase">Lieu</span>
          <div className="flex rounded-lg border border-raja-gray-2 overflow-hidden">
            {(['Domicile', 'Extérieur'] as Lieu[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLieu(l)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  lieu === l ? 'bg-raja-green text-white' : 'bg-white text-raja-text-light hover:bg-raja-gray'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-raja-text-light uppercase">Jour</span>
          <input
            type="date"
            value={day}
            onChange={e => setDay(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-raja-gray-2 text-sm focus:border-raja-green focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-raja-text-light uppercase">Heure (Maroc)</span>
          <input
            type="time"
            value={time}
            disabled={!day}
            onChange={e => setTime(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-raja-gray-2 text-sm focus:border-raja-green focus:outline-none disabled:bg-raja-gray disabled:text-raja-text-light"
          />
        </label>

        <label
          className={`col-span-2 lg:col-span-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer select-none ${
            postponed ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-raja-gray-2 text-raja-text-light'
          }`}
        >
          <input
            type="checkbox"
            checked={postponed}
            onChange={e => setPostponed(e.target.checked)}
            className="accent-orange-500"
          />
          Reporté
        </label>

        <div className="col-span-2 lg:col-span-1 flex gap-1.5">
          {dirty ? (
            <>
              <button
                type="button"
                onClick={reset}
                title="Annuler"
                className="px-3 py-2 rounded-lg border border-raja-gray-2 text-raja-text-light hover:text-raja-dark cursor-pointer"
              >
                <FaUndo className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-raja-green text-white text-xs font-semibold hover:bg-raja-green-light disabled:opacity-50 cursor-pointer"
              >
                <FaCheck className="w-3 h-3" />
                Enregistrer
              </button>
            </>
          ) : (
            <span className="text-xs text-raja-text-light py-2">{formatMatchDate(match.date, match.postponed)}</span>
          )}
        </div>
      </div>

      {/* Cotes : enregistrées à part, figées au coup d'envoi */}
      <div className="mt-3 pt-3 border-t border-raja-gray-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
          <span className="text-[10px] font-semibold text-raja-text-light uppercase">Cotes</span>
          {oddsFrozen ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-raja-text-light">
              <FaLock className="w-2.5 h-2.5" />
              Figées au coup d&apos;envoi
            </span>
          ) : match.odds ? (
            <span className="text-[10px] text-raja-text-light">
              Bon résultat = cote × {ODDS_MULTIPLIER} · score exact +{EXACT_BONUS}
            </span>
          ) : (
            <span className="text-[10px] text-orange-600">
              {kickoffPassed
                ? "Coup d'envoi passé : figées dès l'enregistrement"
                : `Sans cotes : bon résultat = ${DEFAULT_RESULT_POINTS} pts`}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="grid grid-cols-3 gap-2 sm:flex-1 sm:max-w-lg">
            {ODDS_FIELDS.map(({ key, label }) => {
              const odd = parsedOdds[key]
              const valid = isValidOdd(odd)
              return (
                <label key={key} className="min-w-0 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-raja-text-light uppercase truncate">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      inputMode="decimal"
                      value={shownOdds[key]}
                      disabled={oddsFrozen || savingOdds}
                      onChange={e => changeOdd(key, e.target.value)}
                      placeholder="1,70"
                      className={`w-full min-w-0 px-2 py-1.5 rounded-lg border text-center text-sm font-bold focus:outline-none disabled:bg-raja-gray disabled:text-raja-text-light ${
                        shownOdds[key] !== '' && !valid
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-raja-gray-2 focus:border-raja-green'
                      }`}
                    />
                    <span className={`shrink-0 w-11 text-[11px] font-semibold ${valid ? 'text-raja-green' : 'text-raja-text-light'}`}>
                      {valid ? `${Math.round(odd * ODDS_MULTIPLIER)} pts` : '–'}
                    </span>
                  </div>
                </label>
              )
            })}
          </div>

          {!oddsFrozen && (oddsDirty || match.odds) && (
            <div className="flex items-center gap-1.5">
              {oddsDirty && (
                <button
                  type="button"
                  onClick={resetOdds}
                  title="Annuler"
                  className="px-3 py-2 rounded-lg border border-raja-gray-2 text-raja-text-light hover:text-raja-dark cursor-pointer"
                >
                  <FaUndo className="w-3 h-3" />
                </button>
              )}
              {oddsDirty && oddsValid && (
                <button
                  type="button"
                  onClick={() => saveOdds(parsedOdds)}
                  disabled={savingOdds}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-raja-green text-white text-xs font-semibold hover:bg-raja-green-light disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <FaCheck className="w-3 h-3" />
                  Enregistrer les cotes
                </button>
              )}
              {oddsDirty && !oddsValid && (
                <span className="flex-1 sm:flex-none text-[11px] text-raja-text-light">3 cotes entre 1,01 et 100</span>
              )}
              {match.odds && (
                <button
                  type="button"
                  onClick={() => saveOdds(null)}
                  disabled={savingOdds}
                  className="px-1 py-2 text-xs text-raja-text-light hover:text-red-500 disabled:opacity-50 cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>
          )}
        </div>

        {oddsError && <p className="mt-2 text-xs text-red-600">{oddsError}</p>}
      </div>

      {/* Score final */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold text-raja-text-light uppercase mr-1">Score final</span>
        <input
          inputMode="numeric"
          value={homeGoals}
          onChange={e => setHomeGoals(goalsInput(e.target.value))}
          aria-label={`Buts ${home}`}
          placeholder="-"
          className="w-11 py-1.5 rounded-lg border border-raja-gray-2 text-center text-sm font-bold focus:border-raja-green focus:outline-none"
        />
        <span className="text-raja-text-light font-bold">-</span>
        <input
          inputMode="numeric"
          value={awayGoals}
          onChange={e => setAwayGoals(goalsInput(e.target.value))}
          aria-label={`Buts ${away}`}
          placeholder="-"
          className="w-11 py-1.5 rounded-lg border border-raja-gray-2 text-center text-sm font-bold focus:border-raja-green focus:outline-none"
        />
        {scoreDirty && (
          <button
            type="button"
            onClick={() => onSetScore(match.journee, { home: Number(homeGoals), away: Number(awayGoals) })}
            className="px-3 py-1.5 rounded-lg bg-raja-green text-white text-xs font-semibold hover:bg-raja-green-light cursor-pointer"
          >
            Valider le score
          </button>
        )}
        {match.result && (
          <>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${RESULT_STYLES[match.result].className}`}>
              {RESULT_STYLES[match.result].label}
            </span>
            <button
              type="button"
              onClick={() => onSetScore(match.journee, null)}
              className="text-xs text-raja-text-light hover:text-red-500 cursor-pointer"
            >
              Effacer
            </button>
          </>
        )}
      </div>
    </div>
  )
}
