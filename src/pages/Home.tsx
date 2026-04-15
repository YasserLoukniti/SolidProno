import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaFutbol, FaClock, FaChevronLeft, FaChevronRight, FaTrophy } from 'react-icons/fa'
import { fetchData } from '../api/client'
import { calculateLeaderboard } from '../data/scoring'
import type { AppData, Match, User, UserScore } from '../types'
import { getMatchLogos, parseTeams } from '../data/teams'
import TeamLogo from '../components/TeamLogo'

function ResultTag({ value }: { value: 'V' | 'N' | 'D' }) {
  const cls = value === 'V'
    ? 'bg-green-500/30 text-green-300'
    : value === 'N'
    ? 'bg-orange-500/30 text-orange-300'
    : 'bg-red-500/30 text-red-300'
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${cls}`}>{value}</span>
}

function MatchCarousel({ matches, users }: { matches: Match[]; users: User[] }) {
  // Start at first unplayed match, or last match
  const firstUnplayed = matches.findIndex(m => m.result === null)
  const [idx, setIdx] = useState(firstUnplayed >= 0 ? firstUnplayed : matches.length - 1)

  const match = matches[idx]
  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)
  const isPlayed = match.result !== null

  const userPredictions = users
    .map(u => ({ name: u.name, pred: u.predictions[String(match.journee)] }))
    .filter(u => u.pred)

  return (
    <div className="gradient-hero rounded-2xl overflow-hidden">
      {/* Top bar with nav */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <FaChevronLeft className="w-3 h-3" />
        </button>
        <div className="text-center">
          <span className="text-raja-gold text-[10px] font-semibold uppercase tracking-widest">
            {isPlayed ? 'Resultat' : 'A venir'}
          </span>
          <p className="text-white/50 text-xs font-medium mt-0.5">
            Journee {match.journee} &middot; Botola Pro
          </p>
        </div>
        <button
          onClick={() => setIdx(i => Math.min(matches.length - 1, i + 1))}
          disabled={idx === matches.length - 1}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <FaChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Match dots indicator */}
      <div className="flex justify-center gap-1 px-4 pb-3">
        {matches.map((m, i) => (
          <button
            key={m.journee}
            onClick={() => setIdx(i)}
            className={`h-1 rounded-full transition-all cursor-pointer ${
              i === idx ? 'w-4 bg-raja-gold' : m.result ? 'w-1.5 bg-white/30' : 'w-1.5 bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="px-6 pb-5">
        {/* Teams face off */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-center">
            <div className="mb-2"><TeamLogo logo={homeLogo} name={home} /></div>
            <p className="text-white font-bold text-sm leading-tight">{home}</p>
          </div>

          <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
            {isPlayed ? (
              <span
                className={`text-sm font-black px-4 py-1.5 rounded-lg ${
                  match.result === 'V' ? 'bg-green-600 text-white'
                  : match.result === 'N' ? 'bg-orange-500 text-white'
                  : 'bg-red-600 text-white'
                }`}
              >
                {match.result === 'V' ? 'Victoire' : match.result === 'N' ? 'Nul' : 'Defaite'}
              </span>
            ) : (
              <span className="text-2xl font-black text-white/15">VS</span>
            )}
            <div className="flex items-center gap-1 text-white/30 text-[10px]">
              <FaCalendarAlt className="w-2.5 h-2.5" />
              <span>{match.date}</span>
            </div>
            <div className="flex items-center gap-1 text-white/30 text-[10px]">
              <FaMapMarkerAlt className="w-2.5 h-2.5" />
              <span>{match.lieu}</span>
            </div>
          </div>

          <div className="flex-1 text-center">
            <div className="mb-2"><TeamLogo logo={awayLogo} name={away} /></div>
            <p className="text-white font-bold text-sm leading-tight">{away}</p>
          </div>
        </div>

        {/* Per-user predictions - Realistic prominent, W/B smaller */}
        {userPredictions.length > 0 && (
          <div className="mt-5 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="divide-y divide-white/5 max-h-[240px] overflow-y-auto">
              {userPredictions.map(u => {
                const result = match.result
                const gotRealistic = result && u.pred.realistic === result
                const gotWorst = result && u.pred.worst === result
                const gotBest = result && u.pred.best === result
                const points = (gotRealistic ? 3 : 0) + (gotWorst ? 1 : 0) + (gotBest ? 1 : 0)

                const rColor = u.pred.realistic === 'V'
                  ? 'bg-green-500 text-white'
                  : u.pred.realistic === 'N'
                  ? 'bg-orange-500 text-white'
                  : 'bg-red-500 text-white'

                return (
                  <div
                    key={u.name}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      result ? (points === 3 ? 'bg-green-500/10' : points === 1 ? 'bg-orange-500/5' : '') : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-white/80 text-xs font-medium truncate block">{u.name}</span>
                      {result && (
                        <span className={`text-[10px] font-bold ${
                          points >= 3 ? 'text-green-400' : points > 0 ? 'text-orange-400' : 'text-white/20'
                        }`}>
                          +{points} pt{points > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {/* Worst - small */}
                    <div className={`flex flex-col items-center ${result && !gotWorst ? 'opacity-30' : ''}`}>
                      <span className="text-[7px] text-white/40 uppercase leading-none mb-0.5">Pire</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        u.pred.worst === 'V' ? 'bg-green-500/30 text-green-300'
                        : u.pred.worst === 'N' ? 'bg-orange-500/30 text-orange-300'
                        : 'bg-red-500/30 text-red-300'
                      } ${result && gotWorst ? 'ring-2 ring-green-400' : ''}`}>{u.pred.worst}</span>
                      {result && gotWorst && <span className="text-[9px] text-green-400 font-bold mt-0.5">+1</span>}
                    </div>
                    {/* Realistic - BIG */}
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] text-raja-gold uppercase leading-none mb-0.5 font-bold">Prono</span>
                      <span className={`text-sm font-black px-3 py-1 rounded-lg ${rColor} ${
                        result && gotRealistic ? 'ring-2 ring-green-400' : ''
                      }`}>
                        {u.pred.realistic}
                      </span>
                      {result && gotRealistic && <span className="text-[9px] text-green-400 font-bold mt-0.5">+3</span>}
                    </div>
                    {/* Best - small */}
                    <div className={`flex flex-col items-center ${result && !gotBest ? 'opacity-30' : ''}`}>
                      <span className="text-[7px] text-white/40 uppercase leading-none mb-0.5">Best</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        u.pred.best === 'V' ? 'bg-green-500/30 text-green-300'
                        : u.pred.best === 'N' ? 'bg-orange-500/30 text-orange-300'
                        : 'bg-red-500/30 text-red-300'
                      } ${result && gotBest ? 'ring-2 ring-green-400' : ''}`}>{u.pred.best}</span>
                      {result && gotBest && <span className="text-[9px] text-green-400 font-bold mt-0.5">+1</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderboardCompact({ leaderboard, matchesPlayed }: { leaderboard: UserScore[]; matchesPlayed: number }) {
  if (leaderboard.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FaTrophy className="w-3.5 h-3.5 text-raja-gold" />
          <h2 className="text-sm font-bold text-raja-dark uppercase tracking-wide">Classement</h2>
        </div>
        <Link to="/leaderboard" className="text-xs text-raja-green font-medium hover:underline">
          Details
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
        {/* Header */}
        <div className="bg-raja-dark text-white text-[9px] uppercase tracking-wider font-semibold grid grid-cols-[28px_1fr_36px_36px_36px_44px] items-center px-3 py-2">
          <span className="text-center">#</span>
          <span>Joueur</span>
          <span className="text-center">MJ</span>
          <span className="text-center text-green-400">R</span>
          <span className="text-center text-red-400">X</span>
          <span className="text-center">PTS</span>
        </div>

        {/* Rows */}
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1
          const mj = entry.matchScores.length
          const rWins = entry.matchScores.filter(ms => ms.realisticHit).length
          const losses = entry.matchScores.filter(ms => ms.points === 0).length
          const isTop3 = rank <= 3

          return (
            <Link
              key={entry.userId}
              to="/leaderboard"
              className={`grid grid-cols-[28px_1fr_36px_36px_36px_44px] items-center px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors ${
                idx < leaderboard.length - 1 ? 'border-b border-raja-gray-2/50' : ''
              } ${isTop3 ? 'bg-green-50/30' : ''}`}
            >
              <span className={`text-center font-black ${
                rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-raja-text-light'
              }`}>{rank}</span>
              <span className="font-semibold text-raja-dark truncate">{entry.userName}</span>
              <span className="text-center text-raja-text-light">{mj}</span>
              <span className="text-center font-semibold text-green-600">{rWins}</span>
              <span className="text-center font-semibold text-red-500">{losses}</span>
              <span className={`text-center font-black ${isTop3 ? 'text-raja-green' : 'text-raja-dark'}`}>{entry.totalPoints}</span>
            </Link>
          )
        })}

        {matchesPlayed === 0 && (
          <div className="px-4 py-2.5 bg-gray-50 text-center">
            <span className="text-[11px] text-raja-text-light">En attente du premier resultat</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Home() {
  const [data, setData] = useState<AppData | null>(null)
  const [leaderboard, setLeaderboard] = useState<UserScore[]>([])

  useEffect(() => {
    fetchData()
      .then(d => {
        setData(d)
        setLeaderboard(calculateLeaderboard(d.users, d.matches, d.actualPosition))
      })
      .catch(console.error)
  }, [])

  const matchesPlayed = data?.matches.filter(m => m.result !== null).length ?? 0
  const totalMatches = data?.matches.length ?? 15
  const participantCount = data?.users.length ?? 0

  return (
    <div>
      {/* Section 1: Match carousel with user predictions */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        {data && data.matches.length > 0 ? (
          <MatchCarousel matches={data.matches} users={data.users} />
        ) : (
          <div className="gradient-hero rounded-2xl px-6 py-12 text-center">
            <img src="/raja-logo.png" alt="Raja CA" className="w-20 h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-white text-2xl font-bold mb-1">SolidProno</h1>
            <p className="text-white/50 text-sm">Pronostics Botola Pro 2025-26</p>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
        {/* Section 2: Stats + Quick actions */}
        <div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { value: participantCount, label: 'Participants', icon: FaUsers },
              { value: `${matchesPlayed}/${totalMatches}`, label: 'Matchs joues', icon: FaFutbol },
              { value: totalMatches - matchesPlayed, label: 'Restants', icon: FaClock },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-white rounded-xl p-4 text-center border border-raja-gray-2 card-hover"
              >
                <stat.icon className="w-4 h-4 mx-auto text-raja-text-light mb-1" />
                <p className="text-xl font-bold text-raja-dark mt-1">{stat.value}</p>
                <p className="text-[11px] text-raja-text-light uppercase tracking-wide font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Link
              to="/submit"
              className="group bg-raja-green rounded-xl p-5 flex items-center justify-between card-hover"
            >
              <div>
                <p className="text-white font-bold text-lg">Soumettre mes pronos</p>
                <p className="text-white/60 text-sm mt-0.5">{totalMatches} matchs restants</p>
              </div>
              <FaChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
            </Link>
            <Link
              to="/predictions"
              className="group bg-white rounded-xl p-5 flex items-center justify-between border border-raja-gray-2 card-hover"
            >
              <div>
                <p className="text-raja-dark font-bold text-lg">Voir les pronostics</p>
                <p className="text-raja-text-light text-sm mt-0.5">
                  {participantCount} participant{participantCount > 1 ? 's' : ''}
                </p>
              </div>
              <FaChevronRight className="w-3.5 h-3.5 text-raja-text-light group-hover:text-raja-green transition-colors" />
            </Link>
          </div>
        </div>

        {/* Section 3: Classement compact with bars */}
        <LeaderboardCompact leaderboard={leaderboard} matchesPlayed={matchesPlayed} />
      </div>
    </div>
  )
}
