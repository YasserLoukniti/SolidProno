// Map team names (as they appear in match.adversaire) to their logo paths
const teamLogos: Record<string, string> = {
  'RAJA': '/raja-logo.png',
  'FUS Rabat': '/logos/fus-rabat.png',
  'AS FAR': '/logos/as-far.png',
  'Difaa El Jadida': '/logos/difaa-el-jadida.png',
  'MAS Fès': '/logos/mas-fes.png',
  'Wydad Casablanca': '/logos/wydad.png',
  'Olympique Dcheira': '/logos/olympique-dcheira.png',
  'Kawkab Marrakech': '/logos/kawkab-marrakech.png',
  'UTS Rabat': '/logos/uts-rabat.png',
  'Renaissance Zemamra': '/logos/renaissance-zemamra.png',
  'CODM Meknès': '/logos/codm-meknes.png',
  'Yacoub El Mansour': '/logos/yacoub-el-mansour.png',
  'Ittihad Tanger': '/logos/ittihad-tanger.png',
  'RS Berkane': '/logos/rs-berkane.png',
  'Hassania Agadir': '/logos/hassania-agadir.png',
  'Olympic Safi': '/logos/olympic-safi.png',
}

// Teams whose logos should be flipped upside down
const flippedTeams = new Set(['Wydad Casablanca', 'AS FAR'])

export function isRaja(teamName: string): boolean {
  return teamName === 'RAJA'
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
