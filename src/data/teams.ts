// Map team names (as they appear in match.adversaire) to their logo paths
const teamLogos: Record<string, string> = {
  'Raja Casablanca': '/raja-logo.png',
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

export function getTeamLogo(teamName: string): string | null {
  // Try exact match first
  if (teamLogos[teamName]) return teamLogos[teamName]
  // Try partial match
  for (const [key, val] of Object.entries(teamLogos)) {
    if (teamName.includes(key) || key.includes(teamName)) return val
  }
  return null
}

// Extract both team names from "Team A vs Team B"
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
