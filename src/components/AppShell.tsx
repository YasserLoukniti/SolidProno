'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaFutbol, FaTrophy, FaUser, FaArrowLeft } from 'react-icons/fa'
import type { IconType } from 'react-icons'

const TABS: { href: string; label: string; icon: IconType; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Matchs', icon: FaFutbol, match: p => p === '/' },
  { href: '/leaderboard', label: 'Classement', icon: FaTrophy, match: p => p.startsWith('/leaderboard') },
  { href: '/moi', label: 'Moi', icon: FaUser, match: p => p.startsWith('/moi') },
]

// Mobile d'abord : une colonne, onglets en bas. À partir de lg : onglets dans l'en-tête et contenu plus large.
// L'admin garde une mise en page large et claire.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/admin')) {
    return (
      <div className="admin-surface min-h-dvh">
        <div className="bg-raja-dark">
          <div className="max-w-6xl mx-auto px-4 h-12 flex items-center">
            <Link href="/" className="flex items-center gap-2 text-sm text-raja-gray-dark hover:text-white">
              <FaArrowLeft className="w-3 h-3" /> Retour à l&apos;appli
            </Link>
          </div>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-pitch">
      <header className="sticky top-0 z-40 bg-raja text-white shadow-[0_1px_0_rgb(0_0_0/0.08)]">
        <div className="mx-auto w-full max-w-[440px] lg:max-w-5xl h-14 lg:h-16 px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/raja-logo.png" alt="" className="w-9 h-9 lg:w-10 lg:h-10 object-contain rounded-full bg-white p-0.5" />
            <span className="font-display text-2xl lg:text-[28px] font-extrabold uppercase tracking-wide leading-none">
              Solid<span className="text-white/75">Prono</span>
            </span>
          </Link>

          <nav aria-label="Navigation principale" className="hidden lg:flex items-center gap-1">
            {TABS.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold transition-colors ${
                    active ? 'bg-white text-raja-deep' : 'text-white/85 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <span className="lg:hidden font-display text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Botola 26·27</span>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto max-w-[440px] lg:max-w-5xl pb-24 lg:pb-12 lg:pt-4">{children}</main>

      <nav
        aria-label="Navigation principale"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line shadow-[0_-4px_16px_rgb(0_0_0/0.05)] pb-safe"
      >
        <div className="mx-auto max-w-[440px] grid grid-cols-3">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${active ? 'text-raja-deep' : 'text-mist hover:text-chalk'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
