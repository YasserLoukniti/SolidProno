'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchData, submitPredictions } from '@/api/client'
import MatchCard from '@/components/MatchCard'
import type { Result, Prediction, FinalPosition, Match } from '@/types'
import { FaCheckCircle, FaLock, FaDice } from 'react-icons/fa'

export default function SubmitPredictions() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [finalPosition, setFinalPosition] = useState<FinalPosition>({
    worst: 8,
    realistic: 4,
    best: 1,
  })
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

  // Only unplayed matches are available for predictions
  const availableMatches = allMatches.filter(m => m.result === null)
  const playedMatches = allMatches.filter(m => m.result !== null)

  const randomFill = () => {
    const results: Result[] = ['V', 'N', 'D']
    const pick = () => results[Math.floor(Math.random() * 3)]
    const preds: Record<string, Prediction> = {}
    for (const m of availableMatches) {
      preds[String(m.journee)] = { worst: pick(), realistic: pick(), best: pick() }
    }
    setPredictions(preds)
    setFinalPosition({
      worst: Math.floor(Math.random() * 12) + 5,
      realistic: Math.floor(Math.random() * 6) + 3,
      best: Math.floor(Math.random() * 3) + 1,
    })
    if (!name) setName('Test' + Math.floor(Math.random() * 999))
  }

  const handlePredictionChange = (journee: number, scenario: 'worst' | 'realistic' | 'best', value: Result) => {
    setPredictions(prev => ({
      ...prev,
      [String(journee)]: {
        ...prev[String(journee)],
        [scenario]: value,
      } as Prediction,
    }))
    if (highlightJournee === journee) {
      setHighlightJournee(null)
    }
  }

  const findFirstIncomplete = (): { type: 'name' } | { type: 'match'; journee: number } | null => {
    if (!name.trim()) return { type: 'name' }
    for (const match of availableMatches) {
      const pred = predictions[String(match.journee)]
      if (!pred || !pred.worst || !pred.realistic || !pred.best) {
        return { type: 'match', journee: match.journee }
      }
    }
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
        const pred = predictions[String(missing.journee)]
        const missingFields: string[] = []
        if (!pred?.worst) missingFields.push('Pire')
        if (!pred?.realistic) missingFields.push('Realiste')
        if (!pred?.best) missingFields.push('Meilleur')
        const matchInfo = availableMatches.find(m => m.journee === missing.journee)
        setError(`J${missing.journee} — ${matchInfo?.adversaire} : il manque ${missingFields.join(', ')}`)
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
      await submitPredictions(name.trim(), predictions, finalPosition)
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

  const completedCount = availableMatches.filter(m => {
    const pred = predictions[String(m.journee)]
    return pred?.worst && pred?.realistic && pred?.best
  }).length
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
          Remplis chaque match avec tes 3 scenarios. Definitif une fois valide.
        </p>
      </div>

      {/* Regles */}
      <div className="bg-white rounded-xl border border-raja-gray-2 p-4 mb-4">
        <p className="text-xs text-raja-text-light mb-3">
          Pour chaque match, donne 3 pronostics (<strong className="text-raja-dark">V</strong>ictoire, <strong className="text-raja-dark">N</strong>ul, <strong className="text-raja-dark">D</strong>efaite). Les points se cumulent :
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 rounded-lg py-2.5">
            <p className="text-lg font-black text-green-600">+3</p>
            <p className="text-[10px] text-green-700 font-medium">Realiste juste</p>
          </div>
          <div className="bg-red-50 rounded-lg py-2.5">
            <p className="text-lg font-black text-red-500">+1</p>
            <p className="text-[10px] text-red-600 font-medium">Pire juste</p>
          </div>
          <div className="bg-amber-50 rounded-lg py-2.5">
            <p className="text-lg font-black text-amber-600">+1</p>
            <p className="text-[10px] text-amber-700 font-medium">Meilleur juste</p>
          </div>
        </div>
        <p className="text-[10px] text-raja-text-light mt-2 text-center">
          3 bons = <strong className="text-raja-dark">5 pts max</strong> par match
        </p>
      </div>

      {/* Played matches warning */}
      {playedMatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
          <FaLock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {playedMatches.length} match{playedMatches.length > 1 ? 's' : ''} deja joue{playedMatches.length > 1 ? 's' : ''} — tu ne peux pronostiquer que les {availableMatches.length} matchs restants.
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
          <button
            onClick={randomFill}
            className="shrink-0 p-2 rounded-lg bg-raja-dark text-white hover:bg-raja-dark-2 transition-colors cursor-pointer"
            title="Remplir au hasard"
          >
            <FaDice className="w-4 h-4" />
          </button>
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
              onChange={(scenario, value) => handlePredictionChange(match.journee, scenario, value)}
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

      {/* Final position */}
      {availableMatches.length > 0 && (
        <>
          <div className="mt-8 bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
            <div className="bg-raja-dark px-5 py-3">
              <h2 className="text-white font-bold text-sm">Classement final predit</h2>
              <p className="text-white/50 text-xs mt-0.5">Position du Raja au classement Botola Pro (1-16)</p>
            </div>
            <div className="p-5 space-y-3">
              {(['worst', 'realistic', 'best'] as const).map(scenario => {
                const config = {
                  worst: { label: 'Pire scenario', color: 'text-red-500', bg: 'bg-red-50' },
                  realistic: { label: 'Realiste', color: 'text-raja-green', bg: 'bg-green-50' },
                  best: { label: 'Meilleur scenario', color: 'text-raja-gold', bg: 'bg-amber-50' },
                }
                const cfg = config[scenario]
                return (
                  <div key={scenario} className={`flex items-center justify-between px-4 py-3 rounded-lg ${cfg.bg}`}>
                    <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                    <select
                      value={finalPosition[scenario]}
                      onChange={e =>
                        setFinalPosition(prev => ({ ...prev, [scenario]: Number(e.target.value) }))
                      }
                      className="px-3 py-1.5 rounded-lg border border-raja-gray-2 bg-white focus:border-raja-green focus:outline-none text-sm font-bold"
                    >
                      {Array.from({ length: 16 }, (_, i) => i + 1).map(pos => (
                        <option key={pos} value={pos}>
                          {pos}{pos === 1 ? 'er' : 'e'}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

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
