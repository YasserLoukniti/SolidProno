import type { Match, Result } from '@/types'
import { DEFAULT_RESULT_POINTS, resultPoints } from '@/data/scoring'

const RESULTS: Result[] = ['V', 'N', 'D']

const LABEL: Record<Result, string> = { V: 'Victoire Raja', N: 'Nul', D: 'Défaite' }

// Pastille mise en avant, par résultat (thème clair)
const HIGHLIGHT_LIGHT: Record<Result, string> = {
  V: 'bg-green-100 border-green-500 ring-1 ring-green-500/40 text-green-800',
  N: 'bg-orange-100 border-orange-400 ring-1 ring-orange-400/40 text-orange-800',
  D: 'bg-red-100 border-red-400 ring-1 ring-red-400/40 text-red-800',
}
const LABEL_LIGHT: Record<Result, string> = { V: 'text-green-700', N: 'text-orange-700', D: 'text-red-700' }

// Cote décimale au format français : 1.7 → « 1,70 »
export function formatOdd(odd: number): string {
  return odd.toFixed(2).replace('.', ',')
}

// Points d'un match joué : « +37 », « +17 » ou « 0 »
export function formatPoints(points: number): string {
  return points > 0 ? `+${points}` : '0'
}

// Points en jeu sur un match : une pastille par résultat du Raja (points = cote × 10, cote en petit).
// `highlight` : résultat à mettre en avant (prono saisi, ou résultat final d'un match joué).
export default function OddsPills({
  match,
  highlight = null,
  variant = 'light',
}: {
  match: Pick<Match, 'odds'>
  highlight?: Result | null
  variant?: 'light' | 'dark'
}) {
  const dark = variant === 'dark'

  if (!match.odds) {
    return (
      <p className={`text-center text-[11px] ${dark ? 'text-white/50' : 'text-raja-text-light'}`}>
        Cotes pas encore publiées · bon résultat{' '}
        <strong className={dark ? 'text-white' : 'text-raja-dark'}>{DEFAULT_RESULT_POINTS} pts</strong>
      </p>
    )
  }

  const odds = match.odds
  const oddOf: Record<Result, number> = { V: odds.win, N: odds.draw, D: odds.loss }

  return (
    <div className="grid grid-cols-3 gap-1.5" aria-label="Points en jeu selon le résultat du Raja">
      {RESULTS.map(r => {
        const active = highlight === r
        const dimmed = highlight !== null && !active
        const box = dark
          ? active
            ? 'bg-raja-gold/15 border-raja-gold ring-1 ring-raja-gold/50'
            : 'bg-white/5 border-white/10'
          : active
            ? HIGHLIGHT_LIGHT[r]
            : 'bg-raja-gray border-raja-gray-2'
        const label = dark ? (active ? 'text-raja-gold' : 'text-white/60') : active ? '' : LABEL_LIGHT[r]
        const points = dark ? 'text-white' : active ? '' : 'text-raja-dark'
        const odd = dark ? 'text-white/40' : active ? 'opacity-70' : 'text-raja-text-light'

        return (
          <div
            key={r}
            className={`min-w-0 rounded-lg border px-1 py-1.5 text-center leading-tight transition-all ${box} ${
              dimmed ? 'opacity-50' : ''
            }`}
          >
            <p className={`text-[10px] font-semibold truncate ${label}`}>{LABEL[r]}</p>
            <p className={`text-sm font-black tabular-nums whitespace-nowrap ${points}`}>
              {resultPoints(match, r)}
              <span className="text-[10px] font-bold"> pts</span>
            </p>
            <p className={`text-[9px] tabular-nums ${odd}`}>cote {formatOdd(oddOf[r])}</p>
          </div>
        )
      })}
    </div>
  )
}
