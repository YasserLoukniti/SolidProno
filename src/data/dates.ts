import type { Match } from '@/types'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/

// Les dates sont saisies en heure marocaine (fuseau officiel, changements d'heure du ramadan inclus)
const MOROCCO_TZ = 'Africa/Casablanca'

export function parseMatchDate(date: string | null): { day: string; time: string } {
  const m = date ? ISO_DATE.exec(date) : null
  if (!m) return { day: '', time: '' }
  return { day: `${m[1]}-${m[2]}-${m[3]}`, time: m[4] ? `${m[4]}:${m[5]}` : '' }
}

// Décalage (en minutes) du fuseau par rapport à UTC à un instant donné
function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find(p => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - utcMs) / 60000)
}

// Instant absolu du coup d'envoi ; indépendant du fuseau du serveur et du visiteur
export function kickoffTime(date: string | null): number | null {
  const m = date ? ISO_DATE.exec(date) : null
  if (!m) return null
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0))
  // Deux passes pour tomber juste le jour d'un changement d'heure
  const guess = wall - tzOffsetMinutes(wall, MOROCCO_TZ) * 60000
  return wall - tzOffsetMinutes(guess, MOROCCO_TZ) * 60000
}

const dayLabel = (instant: Date, timeZone: string) =>
  instant.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone })
const timeLabel = (instant: Date, timeZone?: string) =>
  instant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone }).replace(':', 'h')

// En heure marocaine par défaut (admin, MCP) ; `local` affiche l'heure du visiteur avec l'heure marocaine si elle diffère
export function formatMatchDate(date: string | null, postponed = false, local = false): string {
  if (!date) return postponed ? 'Reporté' : 'À programmer'
  const m = ISO_DATE.exec(date)
  if (!m) return date

  let full: string
  if (!m[4]) {
    full = dayLabel(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))), 'UTC')
  } else {
    const kickoff = new Date(kickoffTime(date)!)
    const moroccoTime = `${m[4]}h${m[5]}`
    if (local) {
      const viewerTime = timeLabel(kickoff)
      const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      full = `${dayLabel(kickoff, viewerZone)} · ${viewerTime}`
      if (viewerTime !== moroccoTime) full += ` (${moroccoTime} au Maroc)`
    } else {
      full = `${dayLabel(kickoff, MOROCCO_TZ)} · ${moroccoTime}`
    }
  }
  return postponed ? `Reporté · ${full}` : full
}

// "Fermeture dans 2 h 15" ; null si pas de date ou coup d'envoi passé
export function formatTimeUntilKickoff(date: string | null, now = Date.now()): string | null {
  const kickoff = kickoffTime(date)
  if (kickoff === null || kickoff <= now) return null
  const minutes = Math.floor((kickoff - now) / 60000)
  if (minutes < 60) return `${Math.max(minutes, 1)} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ${String(minutes % 60).padStart(2, '0')}`
  const days = Math.floor(hours / 24)
  return `${days} j ${hours % 24} h`
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
