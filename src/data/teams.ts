import type { Lieu } from '@/types'

export const RAJA = 'Raja Club Athletic'

// Adversaires du Raja en Botola Pro 2026-27
export const OPPONENTS = [
  'AS FAR',
  'Renaissance Zemamra',
  'MAS Fès',
  'FUS Rabat',
  'Hassania Agadir',
  'RS Berkane',
  'Ittihad Tanger',
  'WS Témara',
  'Difaa El Jadida',
  'CODM Meknès',
  'Wydad Casablanca',
  'Amal Tiznit',
  'Kawkab Marrakech',
  'UTS Rabat',
  'Moghreb Tétouan',
]

// Map team names (as they appear in match.adversaire) to their logo paths
const teamLogos: Record<string, string> = {
  'Raja Club Athletic': '/raja-logo.png',
  'FUS Rabat': '/logos/fus-rabat.png',
  'AS FAR': '/logos/as-far.png',
  'Difaa El Jadida': '/logos/difaa-el-jadida.png',
  'MAS Fès': '/logos/mas-fes.png',
  'Wydad Casablanca': '/logos/wydad.png',
  'Kawkab Marrakech': '/logos/kawkab-marrakech.png',
  'UTS Rabat': '/logos/uts-rabat.png',
  'Renaissance Zemamra': '/logos/renaissance-zemamra.png',
  'CODM Meknès': '/logos/codm-meknes.png',
  'Ittihad Tanger': '/logos/ittihad-tanger.png',
  'RS Berkane': '/logos/rs-berkane.png',
  'Hassania Agadir': '/logos/hassania-agadir.png',
  'WS Témara': '/logos/ws-temara.png',
  'Amal Tiznit': '/logos/amal-tiznit.png',
}

// Teams whose logos should be flipped upside down
const flippedTeams = new Set(['Wydad Casablanca', 'AS FAR'])

export function isRaja(teamName: string): boolean {
  return teamName === RAJA
}

export function isFlipped(teamName: string): boolean {
  return flippedTeams.has(teamName)
}

export function getTeamLogo(teamName: string): string | null {
  if (teamLogos[teamName]) return teamLogos[teamName]
  for (const [key, val] of Object.entries(teamLogos)) {
    if (teamName.includes(key) || key.includes(teamName)) return val
  }
  return null
}

export function parseTeams(adversaire: string): { home: string; away: string } {
  const parts = adversaire.split(' vs ')
  return { home: parts[0]?.trim() ?? '', away: parts[1]?.trim() ?? '' }
}

export function getMatchLogos(adversaire: string): { homeLogo: string | null; awayLogo: string | null } {
  const { home, away } = parseTeams(adversaire)
  return {
    homeLogo: getTeamLogo(home),
    awayLogo: getTeamLogo(away),
  }
}

export function getOpponent(adversaire: string): string {
  const { home, away } = parseTeams(adversaire)
  return isRaja(home) ? away : home
}

export function buildAdversaire(opponent: string, lieu: Lieu): string {
  return lieu === 'Domicile' ? `${RAJA} vs ${opponent}` : `${opponent} vs ${RAJA}`
}

// Noms courts pour les écrans étroits
const SHORT_NAMES: Record<string, string> = {
  'Raja Club Athletic': 'Raja',
  'Renaissance Zemamra': 'Zemamra',
  'MAS Fès': 'MAS',
  'FUS Rabat': 'FUS',
  'Hassania Agadir': 'Hassania',
  'RS Berkane': 'Berkane',
  'Ittihad Tanger': 'IR Tanger',
  'WS Témara': 'Témara',
  'Difaa El Jadida': 'Difaa',
  'CODM Meknès': 'CODM',
  'Wydad Casablanca': 'Wydad',
  'Amal Tiznit': 'Tiznit',
  'Kawkab Marrakech': 'Kawkab',
  'UTS Rabat': 'UTS',
  'Moghreb Tétouan': 'Tétouan',
}

export function shortName(team: string): string {
  return SHORT_NAMES[team] ?? team
}
