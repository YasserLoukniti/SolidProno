import { isRaja, isFlipped } from '../data/teams'

interface Props {
  logo: string | null
  name: string
  size?: string // tailwind size class e.g. "w-16 h-16"
}

export default function TeamLogo({ logo, name, size = 'w-16 h-16' }: Props) {
  const raja = isRaja(name)
  const flip = isFlipped(name)

  if (!logo) {
    return (
      <div className={`${size} mx-auto rounded-full bg-white/10 flex items-center justify-center`}>
        <span className="text-white/70 text-[10px] font-bold text-center leading-tight px-1">{name}</span>
      </div>
    )
  }

  return (
    <img
      src={logo}
      alt={name}
      className={`${size} mx-auto object-contain ${raja ? 'scale-120' : ''} ${flip ? 'rotate-180' : ''}`}
    />
  )
}
