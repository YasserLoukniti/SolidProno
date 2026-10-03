'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaFutbol, FaClock, FaChevronLeft, FaChevronRight, FaTrophy } from 'react-icons/fa'
import { fetchData } from '@/api/client'
import { calculateLeaderboard, formatScore, scorePrediction } from '@/data/scoring'
import type { AppData, Match, Result, User, UserScore } from '@/types'
import { getMatchLogos, parseTeams } from '@/data/teams'
import TeamLogo from '@/components/TeamLogo'
import { formatMatchDate, nextMatchIndex } from '@/data/dates'

const RESULT_LABEL: Record<Result, string> = { V: 'Victoire', N: 'Nul', D: 'Defaite' }
const RESULT_BG: Record<Result, string> = { V: 'bg-green-600', N: 'bg-orange-500', D: 'bg-red-600' }

function MatchCarousel({ matches, users }: { matches: Match[]; users: User[] }) {
  // Commence au prochain match par date (un match reporté ne passe pas devant)
  const [idx, setIdx] = useState(() => nextMatchIndex(matches))

  const match = matches[idx]
  const { home, away } = parseTeams(match.adversaire)
  const { homeLogo, awayLogo } = getMatchLogos(match.adversaire)
  const isPlayed = match.score !== null && match.result !== null

  // Pronostics des participants, tries par points sur ce match s'il est joue
  const userPredictions = users
    .flatMap(u => {
      const pred = u.predictions[String(match.journee)]
      return pred ? [{ name: u.name, pred, ms: scorePrediction(pred, match) }] : []
    })
    .sort((a, b) => (isPlayed ? b.ms.points - a.ms.points : 0) || a.name.localeCompare(b.name))

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
              i === idx ? 'w-4 bg-raja-gold' : m.score ? 'w-1.5 bg-white/30' : 'w-1.5 bg-white/10'
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
            {match.score && match.result ? (
              <>
                <span className="text-4xl font-black text-white tabular-nums leading-none whitespace-nowrap">
                  {formatScore(match.score)}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full text-white ${RESULT_BG[match.result]}`}>
                  {RESULT_LABEL[match.result]}
                </span>
              </>
            ) : (
              <span className="text-2xl font-black text-white/15">VS</span>
            )}
            <div className="flex items-center gap-1 text-white/30 text-[10px]">
              <FaCalendarAlt className="w-2.5 h-2.5" />
              <span>{formatMatchDate(match.date, match.postponed)}</span>
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

        {/* Score pronostique par chaque participant */}
        {userPredictions.length > 0 && (
          <div className="mt-5 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="divide-y divide-white/5 max-h-[240px] overflow-y-auto">
              {userPredictions.map(({ name, pred, ms }) => (
                <div
                  key={name}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    isPlayed ? (ms.exactHit ? 'bg-raja-gold/15' : ms.resultHit ? 'bg-green-500/10' : '') : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-medium truncate block ${isPlayed && ms.points === 0 ? 'text-white/40' : 'text-white/80'}`}>
                      {name}
                    </span>
                    {isPlayed && (
                      <span className={`text-[10px] font-bold ${
                        ms.exactHit ? 'text-raja-gold' : ms.resultHit ? 'text-green-400' : 'text-white/20'
                      }`}>
                        {ms.exactHit ? 'Score exact' : ms.resultHit ? 'Bon resultat' : 'Rate'}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-black tabular-nums whitespace-nowrap px-3 py-1 rounded-lg ${
                      !isPlayed
                        ? 'bg-white/10 text-white'
                        : ms.exactHit
                        ? 'bg-raja-gold text-raja-dark ring-2 ring-raja-gold/50'
                        : ms.resultHit
                        ? 'bg-green-500 text-white'
                        : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {formatScore(pred)}
                  </span>
                  {isPlayed && (
                    <span className={`w-8 text-right text-xs font-black ${
                      ms.exactHit ? 'text-raja-gold' : ms.resultHit ? 'text-green-400' : 'text-white/20'
                    }`}>
                      +{ms.points}
                    </span>
                  )}
                </div>
              ))}
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
        <Link href="/leaderboard" className="text-xs text-raja-green font-medium hover:underline">
          Details
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-raja-gray-2 overflow-hidden">
        {/* Header */}
        <div className="bg-raja-dark text-white text-[9px] uppercase tracking-wider font-semibold grid grid-cols-[28px_1fr_32px_32px_32px_32px_42px] items-center px-3 py-2">
          <span className="text-center">#</span>
          <span>Joueur</span>
          <span className="text-center">MJ</span>
          <span className="text-center text-raja-gold" title="Score exact (+5)">SE</span>
          <span className="text-center text-green-400" title="Bon resultat (+3)">BR</span>
          <span className="text-center text-red-400" title="Rate">X</span>
          <span className="text-center">PTS</span>
        </div>

        {/* Rows */}
        {leaderboard.map((entry, idx) => {
          const rank = idx + 1
          const mj = entry.matchScores.length
          // resultCount inclut les scores exacts : on ne compte ici que les bons resultats "simples"
          const resultOnly = entry.resultCount - entry.exactCount
          const losses = entry.matchScores.filter(ms => ms.points === 0).length
          const isTop3 = rank <= 3

          return (
            <Link
              key={entry.userId}
              href="/leaderboard"
              className={`grid grid-cols-[28px_1fr_32px_32px_32px_32px_42px] items-center px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors ${
                idx < leaderboard.length - 1 ? 'border-b border-raja-gray-2/50' : ''
              } ${isTop3 ? 'bg-green-50/30' : ''}`}
            >
              <span className={`text-center font-black ${
                rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-raja-text-light'
              }`}>{rank}</span>
              <span className="font-semibold text-raja-dark truncate">{entry.userName}</span>
              <span className="text-center text-raja-text-light">{mj}</span>
              <span className="text-center font-semibold text-amber-600">{entry.exactCount}</span>
              <span className="text-center font-semibold text-green-600">{resultOnly}</span>
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
      .then(d => {
        setData(d)
        setLeaderboard(calculateLeaderboard(d.users, d.matches))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <img src="/raja-logo.png" alt="Raja CA" className="w-16 h-16 object-contain animate-pulse" />
          <div className="w-6 h-6 border-3 border-raja-green border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const matchesPlayed = data?.matches.filter(m => m.score !== null).length ?? 0
  const totalMatches = data?.matches.length ?? 30
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
            <p className="text-white/50 text-sm">Pronostics Botola Pro 2026-27</p>
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
              href="/submit"
              className="group bg-raja-green rounded-xl p-5 flex items-center justify-between card-hover"
            >
              <div>
                <p className="text-white font-bold text-lg">Soumettre mes pronos</p>
                <p className="text-white/60 text-sm mt-0.5">{totalMatches - matchesPlayed} matchs restants</p>
              </div>
              <FaChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
            </Link>
            <Link
              href="/predictions"
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
