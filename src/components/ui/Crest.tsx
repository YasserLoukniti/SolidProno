import { getTeamLogo, isFlipped, isRaja } from '@/data/teams'

// Blason d'équipe ; à défaut de logo, initiales dans un rond tracé à la craie
export default function Crest({ team, size = 64 }: { team: string; size?: number }) {
  const logo = getTeamLogo(team)
  const style = { width: size, height: size }

  if (!logo) {
    const initials = team.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
    return (
      <div style={style} className="shrink-0 rounded-full border-2 border-line flex items-center justify-center">
        <span className="font-display font-bold text-chalk" style={{ fontSize: size * 0.32 }}>{initials}</span>
      </div>
    )
  }

  return (
    <img
      src={logo}
      alt=""
      style={style}
      className={`shrink-0 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] ${isRaja(team) ? 'scale-110' : ''} ${isFlipped(team) ? 'rotate-180' : ''}`}
    />
  )
}
