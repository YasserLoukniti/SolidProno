'use client'

import type { Match, Result } from '@/types'
import { parseTeams, shortName } from '@/data/teams'
import { resultPoints } from '@/data/scoring'

const fmtOdd = (c: number) => c.toFixed(2).replace('.', ',')

// Résultat du Raja correspondant à 1 (domicile gagne), N, 2 (extérieur gagne)
export function tileResult(match: Match, tile: '1' | 'N' | '2'): Result {
  if (tile === 'N') return 'N'
  const homeWins = tile === '1'
  return (match.lieu === 'Domicile') === homeWins ? 'V' : 'D'
}

interface Props {
  match: Match
  // Résultat (point de vue Raja) à mettre en avant : celui du prono saisi, ou le résultat final
  highlight?: Result | null
  // Tap sur une tuile : propose un score type (1-0, 1-1, 0-1) ; absent = lecture seule
  onPick?: (tile: '1' | 'N' | '2') => void
}

// Les trois issues dans l'ordre de l'affiche, avec les points en jeu (cote × 10)
export default function OutcomeTiles({ match, highlight = null, onPick }: Props) {
  const { home, away } = parseTeams(match.adversaire)
  const tiles: { key: '1' | 'N' | '2'; label: string }[] = [
    { key: '1', label: shortName(home) },
    { key: 'N', label: 'Nul' },
    { key: '2', label: shortName(away) },
  ]

  return (
    <div className="grid grid-cols-3 gap-2" role={onPick ? 'group' : undefined} aria-label="Points en jeu">
      {tiles.map(({ key, label }) => {
        const result = tileResult(match, key)
        const odd = match.odds ? (result === 'V' ? match.odds.win : result === 'N' ? match.odds.draw : match.odds.loss) : null
        const active = highlight === result
        const Tag = onPick ? 'button' : 'div'
        return (
          <Tag
            key={key}
            {...(onPick ? { type: 'button' as const, onClick: () => onPick(key), 'aria-pressed': active } : {})}
            className={`rounded-2xl px-2 py-2.5 text-center border transition-colors ${
              active ? 'bg-raja text-white border-raja' : 'bg-pitch-2 border-line text-chalk'
            } ${onPick ? 'cursor-pointer active:scale-[0.97] transition-transform' : ''}`}
          >
            <span className={`block text-[11px] font-semibold truncate ${active ? 'text-white/70' : 'text-mist'}`}>
              {key} · {label}
            </span>
            <span className="scoreboard block text-3xl font-extrabold mt-1">{resultPoints(match, result)}</span>
            <span className={`block text-[10px] font-medium ${active ? 'text-white/60' : 'text-mist/70'}`}>
              {odd ? `pts · cote ${fmtOdd(odd)}` : 'pts'}
            </span>
          </Tag>
        )
      })}
    </div>
  )
}
