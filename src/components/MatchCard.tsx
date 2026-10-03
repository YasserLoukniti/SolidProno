import type { ReactNode } from 'react'
import type { Match, Prediction, Result } from '@/types'
import ScoreInput from './ScoreInput'
import TeamLogo from './TeamLogo'
import OddsPills from './OddsPills'
import KickoffCountdown from './KickoffCountdown'
import { getMatchLogos, parseTeams, isRaja } from '@/data/teams'
import { formatMatchDate } from '@/data/dates'
import { EXACT_BONUS, formatScore, resultPoints, scoreToResult } from '@/data/scoring'

// empty : pas de prono enregistré ni saisi · saved : saisie identique au prono enregistré · dirty : saisie non enregistrée
export type MatchCardStatus = 'empty' | 'saved' | 'dirty'

interface Props {
  match: Match
  // undefined = match pas encore touché, pas de score par défaut
  prediction?: Prediction
  onChange?: (prediction: Prediction) => void
  readOnly?: boolean
  status?: MatchCardStatus
  // Pied de carte (bouton d'enregistrement, messages…)
  children?: ReactNode
}

export const resultConfig: Record<Result, { label: string; className: string }> = {
  V: { label: 'Victoire', className: 'bg-green-100 text-green-700' },
  N: { label: 'Nul', className: 'bg-orange-100 text-orange-700' },
  D: { label: 'Défaite', className: 'bg-red-100 text-red-700' },
}

const borderByStatus: Record<MatchCardStatus, string> = {
  empty: 'border-raja-gray-2',
  saved: 'border-raja-green/40',
  dirty: 'border-raja-gold ring-1 ring-raja-gold/40',
}

export default function MatchCard({ match, prediction, onChange, readOnly, status, children }: Props) {
  const isDomicile = match.lieu === 'Domicile'
  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)

  // Toucher un côté remplit le match : l'autre côté part de 0
  const setGoals = (side: 'home' | 'away', goals: number) => {
    onChange?.({ home: 0, away: 0, ...prediction, [side]: goals })
  }

  const predictedResult = prediction ? scoreToResult(prediction, match.lieu) : null
  const border = borderByStatus[status ?? (prediction ? 'saved' : 'empty')]

  const renderTeam = (side: 'home' | 'away', name: string, logo: string | null) => (
    <div className="flex flex-col items-center gap-2 min-w-0">
      {logo ? (
        <TeamLogo logo={logo} name={name} size="w-10 h-10" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-raja-gray flex items-center justify-center text-sm font-bold text-raja-text-light">
          {name.charAt(0)}
        </div>
      )}
      <p
        className={`text-xs font-semibold text-center leading-tight line-clamp-2 min-h-[2lh] ${
          isRaja(name) ? 'text-raja-green' : 'text-raja-dark'
        }`}
      >
        {name}
      </p>
      <ScoreInput
        value={prediction ? prediction[side] : null}
        onChange={goals => setGoals(side, goals)}
        label={name}
        disabled={readOnly}
      />
    </div>
  )

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all ${border}`}>
      {/* En-tête du match */}
      <div className={`px-4 py-3 flex items-center justify-between gap-2 ${
        isDomicile ? 'bg-raja-green/5' : 'bg-gray-50'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-raja-text-light">
            J{match.journee}
          </span>
          <span className="text-raja-gray-2">|</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
            isDomicile ? 'text-raja-green' : 'text-raja-text-light'
          }`}>
            {match.lieu}
          </span>
        </div>
        {match.result && match.score ? (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${resultConfig[match.result].className}`}
          >
            {formatScore(match.score)} · {resultConfig[match.result].label}
          </span>
        ) : match.postponed ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
            {formatMatchDate(match.date, match.postponed, true)}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-raja-text-light shrink-0 text-right">
            {formatMatchDate(match.date, match.postponed, true)}
          </span>
        )}
      </div>
      {!match.result && (
        <div className="px-3 pt-2 text-right">
          <KickoffCountdown date={match.date} className="text-[10px] font-semibold text-raja-orange" />
        </div>
      )}

      {/* Affiche : logo, nom et compteur de buts sous chaque équipe */}
      <div className="px-3 pt-4 pb-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        {renderTeam('home', home, homeLogo)}
        <span className="self-end pb-2 text-raja-gray-dark font-bold">–</span>
        {renderTeam('away', away, awayLogo)}
      </div>

      {/* Points en jeu : la pastille du résultat pronostiqué est mise en avant */}
      <div className="px-3 pb-3">
        <OddsPills match={match} highlight={predictedResult} />
        <p className="mt-2 text-center text-[11px] text-raja-text-light">
          {predictedResult ? (
            <>
              Ce prono peut rapporter{' '}
              <strong className="text-raja-dark">{resultPoints(match, predictedResult)} pts</strong>{' '}
              <span className="text-raja-gold font-semibold">(+{EXACT_BONUS} si score exact)</span>
            </>
          ) : readOnly ? (
            'Pas de prono'
          ) : (
            'Touche + / − pour pronostiquer'
          )}
        </p>
      </div>

      {children && <div className="border-t border-raja-gray-2 px-4 py-3">{children}</div>}
    </div>
  )
}
