'use client'

import { useEffect, useState } from 'react'
import { FaHourglassHalf } from 'react-icons/fa'
import { formatTimeUntilKickoff } from '@/data/dates'

// "Pronos fermés dans 2 h 15", rafraîchi toutes les 30 s ; rien si pas de date ou coup d'envoi passé
export default function KickoffCountdown({ date, className = '' }: { date: string | null; className?: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const remaining = formatTimeUntilKickoff(date, now)
  if (!remaining) return null

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <FaHourglassHalf className="w-2.5 h-2.5" />
      Pronos fermés dans {remaining}
    </span>
  )
}
