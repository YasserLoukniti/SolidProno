import Link from 'next/link'
import { FaLock } from 'react-icons/fa'
import type { Prediction, User } from '@/types'
import { formatScore } from '@/data/scoring'

// Encart affiché à la place des pronos des autres tant que le match n'a pas commencé.
// `me` : participant connecté (null si personne), son prono est récupéré via fetchMe().
export default function HiddenPredictions({
  journee,
  me,
  variant = 'light',
}: {
  journee: number
  me: User | null
  variant?: 'light' | 'dark'
}) {
  const dark = variant === 'dark'
  const myPred: Prediction | undefined = me?.predictions[String(journee)]

  const box = dark ? 'bg-white/5 border-white/10' : 'bg-white border-raja-gray-2'
  const muted = dark ? 'text-white/50' : 'text-raja-text-light'
  const strong = dark ? 'text-white' : 'text-raja-dark'
  const link = dark
    ? 'bg-raja-gold text-raja-dark hover:bg-raja-gold-light'
    : 'bg-raja-green text-white hover:bg-raja-green-light'
  const scoreCls = dark ? 'bg-white/10 text-white' : 'bg-raja-dark text-white'

  return (
    <div className={`rounded-xl border overflow-hidden ${box}`}>
      <div className={`flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium ${muted}`}>
        <FaLock className="w-3 h-3 shrink-0" />
        <span>Pronos visibles au coup d&apos;envoi</span>
      </div>

      <div className={`flex items-center gap-3 px-4 py-2.5 border-t ${dark ? 'border-white/10' : 'border-raja-gray-2'}`}>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {!me ? (
            <span className={`text-xs ${muted}`}>Pronostique ce match avant le coup d&apos;envoi</span>
          ) : myPred ? (
            <>
              <span className={`text-xs font-medium ${strong}`}>Ton prono :</span>
              <span className={`text-sm font-black tabular-nums whitespace-nowrap px-2.5 py-0.5 rounded-lg ${scoreCls}`}>
                {formatScore(myPred)}
              </span>
            </>
          ) : (
            <span className={`text-xs font-medium ${strong}`}>Tu n&apos;as pas encore pronostiqué</span>
          )}
        </div>
        <Link
          href="/submit"
          className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${link}`}
        >
          {me && myPred ? 'Modifier' : 'Pronostiquer'}
        </Link>
      </div>
    </div>
  )
}
