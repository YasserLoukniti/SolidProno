'use client'

import { useId, useState, type FormEvent } from 'react'
import { login, register } from '@/api/client'
import type { User } from '@/types'

type Mode = 'register' | 'login'

const PASSWORD_MIN = 4

// Inscription ou connexion avec un prénom et un mot de passe ; utilisé par l'écran Matchs et la page Moi
export default function AuthForm({
  onAuthenticated,
  initialMode,
}: {
  onAuthenticated: (user: User) => void
  initialMode?: 'register' | 'login'
}) {
  const id = useId()
  const [mode, setMode] = useState<Mode>(initialMode ?? 'register')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = name.trim().length >= 2 && password.length >= PASSWORD_MIN && !submitting

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const user = await (mode === 'register' ? register : login)(name.trim(), password)
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 min-h-11 px-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer ${
      active ? 'bg-pitch-3 text-chalk' : 'text-mist hover:text-chalk'
    }`
  const inputClass =
    'w-full h-12 px-4 rounded-2xl bg-pitch-3 border border-line text-[15px] text-chalk placeholder:text-mist/60 focus:outline-none focus:border-eagle transition-colors'

  return (
    <div>
      <div role="tablist" aria-label="Inscription ou connexion" className="flex gap-1 p-1 rounded-2xl bg-pitch border border-line">
        <button
          type="button"
          role="tab"
          id={`${id}-tab-register`}
          aria-selected={mode === 'register'}
          aria-controls={`${id}-panel`}
          onClick={() => switchMode('register')}
          className={tabClass(mode === 'register')}
        >
          Je m&apos;inscris
        </button>
        <button
          type="button"
          role="tab"
          id={`${id}-tab-login`}
          aria-selected={mode === 'login'}
          aria-controls={`${id}-panel`}
          onClick={() => switchMode('login')}
          className={tabClass(mode === 'login')}
        >
          J&apos;ai déjà un compte
        </button>
      </div>

      <form
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-${mode}`}
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
        noValidate
      >
        <div>
          <label htmlFor={`${id}-name`} className="block text-[13px] font-medium text-mist mb-1.5">
            Prénom
          </label>
          <input
            id={`${id}-name`}
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="words"
            spellCheck={false}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ton prénom"
            maxLength={30}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${id}-password`} className="block text-[13px] font-medium text-mist mb-1.5">
            Mot de passe
          </label>
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={PASSWORD_MIN}
            maxLength={100}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? `${PASSWORD_MIN} caractères minimum` : 'Ton mot de passe'}
            aria-describedby={`${id}-password-hint`}
            className={inputClass}
          />
          <p id={`${id}-password-hint`} className="text-[13px] text-mist mt-1.5">
            {mode === 'register'
              ? 'Choisis-le librement et retiens-le : il te servira à te reconnecter sur un autre téléphone.'
              : "Celui que tu as choisi à l'inscription."}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-[13px] font-medium text-brick">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full min-h-12 rounded-2xl bg-raja text-[15px] font-semibold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
        >
          {submitting ? 'Un instant…' : mode === 'register' ? "Je m'inscris" : 'Me connecter'}
        </button>
      </form>
    </div>
  )
}
