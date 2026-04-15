import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SolidProno - Raja Club Athletic',
  description: 'Pronostics Botola Pro 2025-26',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Navigation />
        <main className="pb-20 md:pb-8">{children}</main>
        <footer className="hidden md:block bg-raja-dark border-t border-white/10 py-6">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/raja-logo.png" alt="Raja CA" className="w-8 h-8 object-contain opacity-50" />
              <span className="text-raja-gray-dark text-xs">SolidProno &mdash; Raja Club Athletic</span>
            </div>
            <span className="text-raja-gray-dark text-xs">Botola Pro 2025-26</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
