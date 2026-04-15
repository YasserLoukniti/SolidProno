'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaHome, FaTable, FaTrophy, FaCog } from 'react-icons/fa'
import type { IconType } from 'react-icons'

const navItems: { to: string; icon: IconType; label: string }[] = [
  { to: '/', icon: FaHome, label: 'Accueil' },
  { to: '/predictions', icon: FaTable, label: 'Pronostics' },
  { to: '/leaderboard', icon: FaTrophy, label: 'Classement' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <>
      <header className="bg-raja-dark sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/raja-logo.png" alt="Raja CA" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-white text-lg font-bold tracking-tight leading-tight">SolidProno</span>
              <span className="text-raja-gray-dark text-[10px] uppercase tracking-widest leading-tight">Raja Club Athletic</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label }) => (
              <Link
                key={to}
                href={to}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === to ? 'text-white bg-white/10' : 'text-raja-gray-dark hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="w-px h-6 bg-white/10 mx-2" />
            <Link href="/admin" className="p-2 rounded-lg text-raja-gray-dark hover:text-white hover:bg-white/5 transition-colors">
              <FaCog className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>
      <nav className="fixed bottom-0 left-0 right-0 bg-raja-dark border-t border-white/10 md:hidden z-50">
        <div className="flex justify-around py-1.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              href={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                pathname === to ? 'text-raja-green-light' : 'text-raja-gray-dark'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
