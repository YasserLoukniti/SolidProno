import { FaMinus, FaPlus } from 'react-icons/fa'

export const MIN_GOALS = 0
export const MAX_GOALS = 20

interface Props {
  // null = pas encore touché par l'utilisateur (affiché « – »)
  value: number | null
  onChange: (val: number) => void
  label: string
  disabled?: boolean
}

// Compteur de buts : − [chiffre] +
// Sur un compteur non touché, « − » fixe 0 et « + » fixe 1.
export default function ScoreInput({ value, onChange, label, disabled }: Props) {
  const canDecrement = !disabled && (value === null || value > MIN_GOALS)
  const canIncrement = !disabled && (value === null || value < MAX_GOALS)

  const buttonClass = (enabled: boolean) =>
    `w-10 h-10 rounded-full border flex items-center justify-center transition-all select-none touch-manipulation ${
      enabled
        ? 'border-raja-gray-2 bg-white text-raja-dark hover:border-raja-green hover:text-raja-green active:scale-90 cursor-pointer'
        : 'border-raja-gray-2 bg-gray-50 text-gray-300 cursor-not-allowed'
    }`

  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label={`Buts ${label}`}>
      <button
        type="button"
        disabled={!canDecrement}
        onClick={() => onChange(value === null ? MIN_GOALS : value - 1)}
        aria-label={`Retirer un but à ${label}`}
        className={buttonClass(canDecrement)}
      >
        <FaMinus className="w-3 h-3" />
      </button>
      <span
        aria-live="polite"
        className={`w-8 text-center text-2xl font-black tabular-nums ${
          value === null ? 'text-raja-gray-2' : 'text-raja-dark'
        }`}
      >
        {value === null ? '–' : value}
      </span>
      <button
        type="button"
        disabled={!canIncrement}
        onClick={() => onChange(value === null ? 1 : value + 1)}
        aria-label={`Ajouter un but à ${label}`}
        className={buttonClass(canIncrement)}
      >
        <FaPlus className="w-3 h-3" />
      </button>
    </div>
  )
}
