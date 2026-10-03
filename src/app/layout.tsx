import type { Metadata, Viewport } from 'next'
import { Big_Shoulders, Onest } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/AppShell'

const bigShoulders = Big_Shoulders({ subsets: ['latin'], variable: '--font-big-shoulders', weight: 'variable' })
const onest = Onest({ subsets: ['latin'], variable: '--font-onest', weight: 'variable' })

export const metadata: Metadata = {
  title: 'SolidProno · Raja',
  description: 'Pronostics des matchs du Raja · Botola Pro 2026-27',
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#00A651',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bigShoulders.variable} ${onest.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
