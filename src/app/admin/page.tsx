'use client'

import { useState, useEffect } from 'react'
import { fetchAdminData, adminLogin, adminLogout, updateMatch, deleteUser, syncMatches, resetSeason, SESSION_EXPIRED } from '@/api/client'
import type { AppData, Match, Result, Score } from '@/types'
import { OPPONENTS, RAJA, getOpponent, getTeamLogo } from '@/data/teams'
import AdminMatchRow, { TeamBadge, type MatchEdit } from '@/components/AdminMatchRow'
import { FaTrash, FaLock, FaSignOutAlt, FaSync, FaRedo } from 'react-icons/fa'

type Tab = 'matchs' | 'equipes' | 'participants' | 'saison'
type Filter = 'tous' | 'a-venir' | 'a-programmer' | 'reportes' | 'joues'

const TABS: { id: Tab; label: string }[] = [
  { id: 'matchs', label: 'Matchs' },
  { id: 'equipes', label: 'Équipes' },
  { id: 'participants', label: 'Participants' },
  { id: 'saison', label: 'Saison' },
]

const FILTERS: { id: Filter; label: string; test: (m: Match) => boolean }[] = [
  { id: 'tous', label: 'Tous', test: () => true },
  { id: 'a-venir', label: 'À venir', test: m => m.result === null },
  { id: 'a-programmer', label: 'À programmer', test: m => m.result === null && !m.date },
  { id: 'reportes', label: 'Reportés', test: m => m.result === null && m.postponed },
  { id: 'joues', label: 'Joués', test: m => m.result !== null },
]

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [tab, setTab] = useState<Tab>('matchs')
  const [filter, setFilter] = useState<Filter>('tous')

  useEffect(() => {
    if (sessionStorage.getItem('adminToken')) setAuthenticated(true)
  }, [])

  useEffect(() => {
    if (authenticated) {
      setLoading(true)
      loadData()
    }
  }, [authenticated])

  const loadData = () => {
    fetchAdminData()
      .then(setData)
      .catch(e => fail(e, 'Impossible de charger les données'))
      .finally(() => setLoading(false))
  }

  const flash = (text: string, error = false) => {
    setMessage({ text, error })
    setTimeout(() => setMessage(null), error ? 4000 : 2500)
  }

  const logout = (reason?: string) => {
    sessionStorage.removeItem('adminToken')
    adminLogout().catch(console.error)
    setAuthenticated(false)
    setLoginError(reason ?? '')
  }

  // Une réponse 401 renvoie vers la connexion, le reste affiche un message d'erreur
  const fail = (e: unknown, text: string) => {
    if (e instanceof Error && e.message === SESSION_EXPIRED) logout('Session expirée, reconnecte-toi')
    else flash(text, true)
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

  const handleSaveMatch = async (journee: number, edit: MatchEdit) => {
    try {
      await updateMatch(journee, edit)
      flash(`J${journee} enregistrée`)
      loadData()
    } catch (e) {
      fail(e, `Erreur lors de l'enregistrement de J${journee}`)
    }
  }

  const handleSetScore = async (journee: number, score: Score | null) => {
    try {
      await updateMatch(journee, { score })
      flash(score ? `Score J${journee} enregistré` : `Score J${journee} effacé`)
      loadData()
    } catch (e) {
      fail(e, 'Erreur')
    }
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return
    try {
      await deleteUser(userId)
      flash(`${name} supprimé`)
      loadData()
    } catch (e) {
      fail(e, 'Erreur')
    }
  }

  const handleSyncMatches = async () => {
    if (!confirm('Resynchroniser le calendrier des matchs depuis le code ? (les résultats déjà saisis sont conservés)')) return
    try {
      const { matchCount } = await syncMatches()
      flash(`${matchCount} matchs synchronisés`)
      loadData()
    } catch (e) {
      fail(e, 'Erreur de synchronisation')
    }
  }

  const handleResetSeason = async () => {
    const pwd = prompt('Nouvelle saison : tous les participants, pronostics et scores seront supprimés.\nMot de passe admin pour confirmer :')
    if (!pwd) return
    try {
      const { matchCount } = await resetSeason(pwd)
      flash(`Nouvelle saison initialisée (${matchCount} matchs)`)
      loadData()
    } catch (e) {
      flash(e instanceof Error && e.message.startsWith('Mot de passe') ? e.message : 'Erreur de réinitialisation', true)
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

  const played = data.matches.filter(m => m.result !== null)
  const toSchedule = data.matches.filter(m => m.result === null && !m.date)
  const record = (['V', 'N', 'D'] as Result[]).map(r => played.filter(m => m.result === r).length)
  const activeFilter = FILTERS.find(f => f.id === filter)!
  const visibleMatches = data.matches.filter(activeFilter.test)
  const phases = [
    { title: 'Phase aller', matches: visibleMatches.filter(m => m.journee <= 15) },
    { title: 'Phase retour', matches: visibleMatches.filter(m => m.journee > 15) },
  ].filter(p => p.matches.length > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6 pb-12">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-raja-dark">Administration</h1>
          <p className="text-raja-text-light text-sm mt-0.5">Botola Pro 2026-27 · calendrier, résultats et participants</p>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1.5 text-xs text-raja-text-light hover:text-red-500 transition-colors cursor-pointer"
        >
          <FaSignOutAlt className="w-4 h-4" />
          Déconnexion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { value: `${played.length}/${data.matches.length}`, label: 'Matchs joués' },
          { value: `${record[0]}V ${record[1]}N ${record[2]}D`, label: 'Bilan' },
          { value: toSchedule.length, label: 'À programmer' },
          { value: data.users.length, label: 'Participants' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-raja-gray-2 p-3 text-center">
            <p className="text-lg font-bold text-raja-dark">{s.value}</p>
            <p className="text-[10px] text-raja-text-light uppercase tracking-wide font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-raja-gray-2 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${
              tab === t.id ? 'border-raja-green text-raja-green' : 'border-transparent text-raja-text-light hover:text-raja-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={`sticky top-20 z-20 px-4 py-2 rounded-xl text-sm mb-4 border ${
            message.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {tab === 'matchs' && (
        <section>
          <div className="flex flex-wrap gap-2 mb-4">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  filter === f.id
                    ? 'bg-raja-dark text-white border-raja-dark'
                    : 'bg-white text-raja-text-light border-raja-gray-2 hover:border-gray-400'
                }`}
              >
                {f.label} ({data.matches.filter(f.test).length})
              </button>
            ))}
          </div>

          {phases.length === 0 && <p className="text-raja-text-light text-sm">Aucun match.</p>}

          {phases.map(phase => (
            <div key={phase.title} className="mb-6">
              <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">{phase.title}</h2>
              <div className="space-y-3">
                {phase.matches.map(match => (
                  <AdminMatchRow
                    key={`${match.journee}-${match.adversaire}-${match.date}-${match.score?.home}-${match.score?.away}`}
                    match={match}
                    onSave={handleSaveMatch}
                    onSetScore={handleSetScore}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'equipes' && (
        <section>
          <p className="text-sm text-raja-text-light mb-4">
            16 équipes. Pour ajouter un logo manquant, dépose un PNG dans <code className="text-xs">public/logos/</code> et référence-le dans <code className="text-xs">src/data/teams.ts</code>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[RAJA, ...OPPONENTS].map(team => {
              const fixtures = data.matches.filter(m => getOpponent(m.adversaire) === team)
              return (
                <div key={team} className="bg-white rounded-xl border border-raja-gray-2 p-3 flex items-center gap-3">
                  <TeamBadge name={team} size="w-12 h-12" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-raja-dark truncate">{team}</p>
                    {team === RAJA ? (
                      <p className="text-[11px] text-raja-text-light">{data.matches.length} matchs</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {fixtures.map(m => (
                          <span
                            key={m.journee}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              m.lieu === 'Domicile' ? 'bg-green-50 text-raja-green' : 'bg-raja-gray text-raja-text-light'
                            }`}
                          >
                            J{m.journee} {m.lieu === 'Domicile' ? 'DOM' : 'EXT'}
                            {m.score ? ` · ${m.score.home}-${m.score.away}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!getTeamLogo(team) && (
                    <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                      Logo manquant
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {tab === 'participants' && (
        <section>
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
                      Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')} · {Object.keys(user.predictions).length} pronostics
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
      )}

      {tab === 'saison' && (
        <section className="space-y-6">
          <div>
            <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide mb-3">Calendrier</h2>
            <div className="bg-white rounded-xl border border-raja-gray-2 p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-raja-dark">Resync calendrier</p>
                  <p className="text-xs text-raja-text-light mt-0.5">
                    Remplace les matchs par ceux du code (<code>src/data/matches.ts</code>). Garde les scores et les participants,
                    mais écrase les dates et adversaires modifiés ici.
                  </p>
                </div>
                <button
                  onClick={handleSyncMatches}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-raja-gray-2 text-xs font-semibold text-raja-dark hover:border-raja-green hover:text-raja-green transition-colors cursor-pointer"
                >
                  <FaSync className="w-3 h-3" />
                  Resync
                </button>
              </div>
              <div className="flex items-start justify-between gap-4 pt-4 border-t border-raja-gray-2">
                <div>
                  <p className="text-sm font-semibold text-red-600">Nouvelle saison</p>
                  <p className="text-xs text-raja-text-light mt-0.5">
                    Supprime tous les participants, pronostics et scores, puis charge le calendrier du code.
                  </p>
                </div>
                <button
                  onClick={handleResetSeason}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <FaRedo className="w-3 h-3" />
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
