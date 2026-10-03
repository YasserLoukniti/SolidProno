'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchData, submitPredictions } from '@/api/client'
import MatchCard from '@/components/MatchCard'
import type { Prediction, Match } from '@/types'
import { POINTS_RESULT, POINTS_EXACT } from '@/data/scoring'
import { isOpenForPredictions } from '@/data/dates'
import { FaCheckCircle, FaLock } from 'react-icons/fa'

export default function SubmitPredictions() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [highlightJournee, setHighlightJournee] = useState<number | null>(null)
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const nameRef = useRef<HTMLInputElement>(null)
  const matchRefs = useRef<Record<number, HTMLDivElement | null>>({})

  useEffect(() => {
    fetchData()
      .then(d => setAllMatches(d.matches))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Pronostics ouverts jusqu'au coup d'envoi
  const availableMatches = allMatches.filter(m => isOpenForPredictions(m))
  const playedMatches = allMatches.filter(m => !isOpenForPredictions(m))

  const handlePredictionChange = (journee: number, prediction: Prediction) => {
    setPredictions(prev => ({ ...prev, [String(journee)]: prediction }))
    if (highlightJournee === journee) {
      setHighlightJournee(null)
    }
  }

  const findFirstIncomplete = (): { type: 'name' } | { type: 'match'; journee: number } | null => {
    if (!name.trim()) return { type: 'name' }
    // Un match n'est rempli que si l'utilisateur l'a touché
    const missingMatch = availableMatches.find(m => !predictions[String(m.journee)])
    if (missingMatch) return { type: 'match', journee: missingMatch.journee }
    return null
  }

  const handleSubmit = async () => {
    const missing = findFirstIncomplete()
    if (missing) {
      if (missing.type === 'name') {
        setError('Entre ton prenom pour continuer')
        nameRef.current?.focus()
        nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        const matchInfo = availableMatches.find(m => m.journee === missing.journee)
        setError(`J${missing.journee} — ${matchInfo?.adversaire} : il manque ton score`)
        setHighlightJournee(missing.journee)
        matchRefs.current[missing.journee]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setError('')
    setHighlightJournee(null)
    setShowConfirm(true)
  }

  const confirmSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await submitPredictions(name.trim(), predictions)
      // Small delay to let Blob propagate before redirecting
      await new Promise(r => setTimeout(r, 1500))
      router.push('/predictions')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }

  const completedCount = availableMatches.filter(m => predictions[String(m.journee)]).length
  const totalRequired = availableMatches.length
  const progress = totalRequired > 0 ? (completedCount / totalRequired) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-raja-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-raja-dark">Soumettre mes pronostics</h1>
        <p className="text-raja-text-light text-sm mt-1">
          Pronostique le score de chaque match. Definitif une fois valide.
        </p>
      </div>

      {/* Regles */}
      <div className="bg-white rounded-xl border border-raja-gray-2 px-4 py-3 mb-4 text-center">
        <p className="text-sm text-raja-text-light">
          Bon résultat : <strong className="text-green-600">+{POINTS_RESULT} pts</strong>
          <span className="mx-2 text-raja-gray-2">·</span>
          Score exact : <strong className="text-raja-gold">+{POINTS_EXACT} pts</strong>
        </p>
        <p className="text-[10px] text-raja-text-light mt-1">Non cumulable : un score exact rapporte {POINTS_EXACT} pts au total.</p>
      </div>

      {/* Played matches warning */}
      {playedMatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
          <FaLock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {playedMatches.length} match{playedMatches.length > 1 ? 's' : ''} déjà commencé{playedMatches.length > 1 ? 's' : ''} ou joué{playedMatches.length > 1 ? 's' : ''} — tu ne peux pronostiquer que les {availableMatches.length} matchs restants.
          </span>
        </div>
      )}

      {/* Name + Progress sticky bar */}
      <div className="sticky top-16 z-30 bg-raja-gray/95 backdrop-blur-sm -mx-4 px-4 py-3 border-b border-raja-gray-2 mb-6">
        <div className="flex items-center gap-4">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ton prenom"
            className="flex-shrink-0 w-40 px-3 py-2 rounded-lg border border-raja-gray-2 bg-white focus:border-raja-green focus:outline-none text-sm font-medium"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-raja-text-light mb-1">
              <span>{completedCount}/{totalRequired}</span>
              {completedCount === totalRequired && totalRequired > 0 && (
                <span className="flex items-center gap-1 text-raja-green font-medium">
                  <FaCheckCircle className="w-3.5 h-3.5" /> Complet
                </span>
              )}
            </div>
            <div className="w-full bg-raja-gray-2 rounded-full h-1.5">
              <div
                className="bg-raja-green h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Match cards grid - only unplayed matches */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableMatches.map(match => (
          <div
            key={match.journee}
            ref={el => { matchRefs.current[match.journee] = el }}
            className={`transition-all duration-300 rounded-xl ${
              highlightJournee === match.journee
                ? 'ring-2 ring-red-500 ring-offset-2 animate-highlight'
                : ''
            }`}
          >
            <MatchCard
              match={match}
              prediction={predictions[String(match.journee)]}
              onChange={prediction => handlePredictionChange(match.journee, prediction)}
            />
          </div>
        ))}
      </div>

      {availableMatches.length === 0 && (
        <div className="text-center py-12 text-raja-text-light">
          <FaLock className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tous les matchs ont deja ete joues.</p>
          <p className="text-sm mt-1">Il n'est plus possible de soumettre des pronostics.</p>
        </div>
      )}

      {availableMatches.length > 0 && (
        <>
          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 mb-8 w-full bg-raja-green text-white py-4 rounded-xl text-base font-bold hover:bg-raja-green-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Envoi en cours...' : 'Valider mes pronostics'}
          </button>
        </>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-raja-green/10 flex items-center justify-center mx-auto mb-3">
                <FaCheckCircle className="w-6 h-6 text-raja-green" />
              </div>
              <h3 className="text-lg font-bold text-raja-dark">Confirmer tes pronostics ?</h3>
              <p className="text-raja-text-light text-sm mt-1">
                Cette action est definitive. Tu ne pourras plus modifier tes choix.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-raja-gray-2 text-raja-text-light font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-raja-green text-white font-medium hover:bg-raja-green-light disabled:opacity-50 transition-colors"
              >
                {submitting ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
