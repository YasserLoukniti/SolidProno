import { useState, useEffect } from 'react'
import { fetchData, adminLogin, setMatchResult, deleteUser, setFinalPosition } from '../api/client'
import type { AppData, Result } from '../types'
import { FaTrash, FaLock, FaSignOutAlt } from 'react-icons/fa'

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('adminToken')) setAuthenticated(true)
  }, [])

  useEffect(() => {
    if (authenticated) loadData()
  }, [authenticated])

  const loadData = () => {
    setLoading(true)
    fetchData().then(setData).catch(console.error).finally(() => setLoading(false))
  }

  const handleLogin = async () => {
    setLoginError('')
    try {
      const result = await adminLogin(password)
      sessionStorage.setItem('adminToken', result.token)
      setAuthenticated(true)
    } catch {
      setLoginError('Mot de passe incorrect')
    }
  }

  const handleSetResult = async (journee: number, result: Result | null) => {
    try {
      await setMatchResult(journee, result)
      setMessage(`J${journee} mis à jour`)
      loadData()
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('Erreur')
    }
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return
    try {
      await deleteUser(userId)
      setMessage(`${name} supprimé`)
      loadData()
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('Erreur')
    }
  }

  const handleSetPosition = async (pos: number | null) => {
    try {
      await setFinalPosition(pos)
      setMessage('Position mise à jour')
      loadData()
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('Erreur')
    }
  }

  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm border border-raja-gray-2">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-raja-dark flex items-center justify-center mx-auto mb-3">
              <FaLock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold text-raja-dark">Administration</h1>
            <p className="text-xs text-raja-text-light mt-0.5">Accès réservé</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Mot de passe"
              className="w-full px-4 py-3 rounded-xl border border-raja-gray-2 focus:border-raja-green focus:outline-none text-sm"
            />
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-raja-green text-white py-3 rounded-xl text-sm font-semibold hover:bg-raja-green-light transition-colors cursor-pointer"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-raja-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-raja-dark">Administration</h1>
          <p className="text-raja-text-light text-sm mt-0.5">Gérer les résultats et participants</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('adminToken'); setAuthenticated(false) }}
          className="flex items-center gap-1.5 text-xs text-raja-text-light hover:text-red-500 transition-colors cursor-pointer"
        >
          <FaSignOutAlt className="w-4 h-4" />
          Déconnexion
        </button>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm mb-4">
          {message}
        </div>
      )}

      {/* Match results */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">
          Résultats des matchs
        </h2>
        <div className="space-y-2">
          {data.matches.map(match => {
            const parts = match.adversaire.split(' vs ')
            return (
              <div
                key={match.journee}
                className={`bg-white rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  match.result ? 'border-green-200' : 'border-raja-gray-2'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-raja-text-light shrink-0">J{match.journee}</span>
                  <span className={`text-[10px] font-semibold uppercase shrink-0 ${
                    match.lieu === 'Domicile' ? 'text-raja-green' : 'text-raja-text-light'
                  }`}>{match.lieu === 'Domicile' ? 'DOM' : 'EXT'}</span>
                  <span className="text-sm font-medium text-raja-dark truncate">
                    {parts[0]} vs {parts[1]}
                  </span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {(['V', 'N', 'D'] as Result[]).map(r => (
                    <button
                      key={r}
                      onClick={() => handleSetResult(match.journee, match.result === r ? null : r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        match.result === r
                          ? r === 'V'
                            ? 'bg-green-600 text-white border-green-600'
                            : r === 'N'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-raja-text-light border-raja-gray-2 hover:border-gray-400'
                      }`}
                    >
                      {r === 'V' ? 'Victoire' : r === 'N' ? 'Nul' : 'Défaite'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Final position */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">
          Position finale
        </h2>
        <div className="bg-white rounded-xl border border-raja-gray-2 p-4 flex items-center gap-4">
          <select
            value={data.actualPosition ?? ''}
            onChange={e => handleSetPosition(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 rounded-lg border border-raja-gray-2 bg-white focus:border-raja-green focus:outline-none text-sm font-bold"
          >
            <option value="">Non défini</option>
            {Array.from({ length: 16 }, (_, i) => i + 1).map(pos => (
              <option key={pos} value={pos}>{pos}{pos === 1 ? 'er' : 'e'}</option>
            ))}
          </select>
          <span className="text-sm text-raja-text-light">
            {data.actualPosition ? `Raja est ${data.actualPosition}${data.actualPosition === 1 ? 'er' : 'e'}` : 'Non défini'}
          </span>
        </div>
      </section>

      {/* Users */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">
          Participants ({data.users.length})
        </h2>
        {data.users.length === 0 ? (
          <p className="text-raja-text-light text-sm">Aucun participant.</p>
        ) : (
          <div className="space-y-2">
            {data.users.map(user => (
              <div
                key={user.id}
                className="bg-white rounded-xl border border-raja-gray-2 px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm text-raja-dark">{user.name}</p>
                  <p className="text-[10px] text-raja-text-light">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteUser(user.id, user.name)}
                  className="p-2 text-raja-text-light hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
