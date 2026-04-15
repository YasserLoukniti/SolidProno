import type { Result } from '../types'

interface Props {
  value: Result | null
  onChange: (val: Result) => void
  disabled?: boolean
}

const options: { value: Result; label: string; activeClass: string; inactiveClass: string }[] = [
  {
    value: 'V',
    label: 'V',
    activeClass: 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-200',
    inactiveClass: 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600',
  },
  {
    value: 'N',
    label: 'N',
    activeClass: 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200',
    inactiveClass: 'border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500',
  },
  {
    value: 'D',
    label: 'D',
    activeClass: 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-200',
    inactiveClass: 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-600',
  },
]

export default function PredictionSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-1.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`w-8 h-8 rounded-md border text-xs font-bold transition-all ${
            value === opt.value ? opt.activeClass : `bg-white ${opt.inactiveClass}`
          } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
