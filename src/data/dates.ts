import type { Match } from '@/types'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/

// Les dates sont saisies en heure marocaine et affichées telles quelles, sans conversion de fuseau
export function parseMatchDate(date: string | null): { day: string; time: string } {
  const m = date ? ISO_DATE.exec(date) : null
  if (!m) return { day: '', time: '' }
  return { day: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : '' }
}

export function formatMatchDate(date: string | null, postponed = false): string {
  if (!date) return postponed ? 'Reporté' : 'À programmer'
  const m = ISO_DATE.exec(date)
  if (!m) return date
  const day = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  const label = day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const full = m[4] ? `${label} · ${m[4]}h${m[5]}` : label
  return postponed ? `Reporté · ${full}` : full
}

// Le Maroc est à UTC+1 (hors ramadan)
const MOROCCO_OFFSET = '+01:00'

export function kickoffTime(date: string | null): number | null {
  const { day, time } = parseMatchDate(date)
  if (!day) return null
  return Date.parse(`${day}T${time || '00:00'}:00${MOROCCO_OFFSET}`)
}

// Pronostics ouverts jusqu'au coup d'envoi ; un match sans date (reporté ou non programmé) reste ouvert
export function isOpenForPredictions(match: Match, now = Date.now()): boolean {
  if (match.result !== null) return false
  const kickoff = kickoffTime(match.date)
  return kickoff === null || now < kickoff
}

// Prochain match à afficher : le plus tôt par date parmi les non joués, sinon le premier non joué
export function nextMatchIndex(matches: Match[]): number {
  let next = -1
  let nextKickoff = Infinity
  matches.forEach((m, i) => {
    const kickoff = m.score === null ? kickoffTime(m.date) : null
    if (kickoff !== null && kickoff < nextKickoff) {
      next = i
      nextKickoff = kickoff
    }
  })
  if (next >= 0) return next
  const firstUnplayed = matches.findIndex(m => m.score === null)
  return firstUnplayed >= 0 ? firstUnplayed : matches.length - 1
}
