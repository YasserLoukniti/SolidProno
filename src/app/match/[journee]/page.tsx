import { redirect } from 'next/navigation'

// Ancienne page d'un match : l'écran Matchs ouvre directement la journée demandée
export default async function MatchPage({ params }: { params: Promise<{ journee: string }> }) {
  const { journee } = await params
  const n = Number(journee)
  redirect(Number.isInteger(n) && n > 0 ? `/?j=${n}` : '/')
}
