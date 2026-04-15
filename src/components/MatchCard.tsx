import type { Match, Prediction, Result } from '@/types'
import PredictionSelector from './PredictionSelector'
import TeamLogo from './TeamLogo'
import { getMatchLogos, parseTeams } from '@/data/teams'

interface Props {
  match: Match
  prediction?: Prediction
  onChange?: (scenario: 'worst' | 'realistic' | 'best', value: Result) => void
  readOnly?: boolean
  resultHighlight?: 'worst' | 'realistic' | 'best' | null
}

const scenarioConfig = {
  worst: { label: 'Pire scénario', short: 'W', color: 'text-red-500' },
  realistic: { label: 'Réaliste', short: 'R', color: 'text-raja-green' },
  best: { label: 'Meilleur scénario', short: 'B', color: 'text-raja-gold' },
}

export default function MatchCard({ match, prediction, onChange, readOnly, resultHighlight }: Props) {
  const isDomicile = match.lieu === 'Domicile'
  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)

  return (
    <div
      className={`bg-white rounded-xl border overflow-hidden transition-all ${
        match.result ? 'border-raja-green/30' : 'border-raja-gray-2'
      }`}
    >
      {/* Match header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isDomicile ? 'bg-raja-green/5' : 'bg-gray-50'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-raja-text-light">
            Journée {match.journee}
          </span>
          <span className="text-raja-gray-2">|</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
            isDomicile ? 'text-raja-green' : 'text-raja-text-light'
          }`}>
            {match.lieu}
          </span>
        </div>
        {match.result && (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              match.result === 'V'
                ? 'bg-green-100 text-green-700'
                : match.result === 'N'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {match.result === 'V' ? 'Victoire' : match.result === 'N' ? 'Nul' : 'Défaite'}
          </span>
        )}
      </div>

      {/* Teams with logos */}
      <div className="px-4 py-3 flex items-center gap-3">
        {homeLogo && <TeamLogo logo={homeLogo} name={home} size="w-8 h-8" />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-raja-dark truncate">{home}</p>
          <p className="font-semibold text-sm text-raja-dark truncate">{away}</p>
        </div>
        {awayLogo && <TeamLogo logo={awayLogo} name={away} size="w-8 h-8" />}
      </div>

      {/* Prediction selectors */}
      <div className="px-4 pb-4 space-y-2">
        {(['worst', 'realistic', 'best'] as const).map(scenario => {
          const cfg = scenarioConfig[scenario]
          const isHighlighted = resultHighlight === scenario
          return (
            <div
              key={scenario}
              className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition-all ${
                isHighlighted
                  ? scenario === 'realistic'
                    ? 'bg-green-50 ring-1 ring-green-400'
                    : 'bg-orange-50 ring-1 ring-orange-300'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${cfg.color}`}>{cfg.short}</span>
                <span className="text-xs text-raja-text-light">{cfg.label}</span>
              </div>
              <PredictionSelector
                value={prediction?.[scenario] ?? null}
                onChange={val => onChange?.(scenario, val)}
                disabled={readOnly}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
