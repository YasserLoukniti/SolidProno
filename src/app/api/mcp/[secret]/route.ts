import { timingSafeEqual } from 'crypto'
import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { getData } from '@/lib/storage'
import { applyMatchUpdate } from '@/lib/matchUpdate'
import { calculateLeaderboard, formatScore, resultPoints, EXACT_BONUS } from '@/data/scoring'
import { formatMatchDate, isOpenForPredictions } from '@/data/dates'
import type { Match } from '@/types'

// Serveur MCP pour gérer le calendrier depuis Claude (téléphone, desktop).
// L'URL contient un secret (MCP_SECRET) : sans lui la route répond 404.

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] })
const fmtOdd = (c: number) => c.toFixed(2).replace('.', ',')

function describeMatch(m: Match): string {
  const parts = [`J${m.journee} · ${m.adversaire} (${m.lieu === 'Domicile' ? 'domicile' : 'extérieur'})`, formatMatchDate(m.date, m.postponed)]
  parts.push(
    m.odds
      ? `cotes V ${fmtOdd(m.odds.win)} / N ${fmtOdd(m.odds.draw)} / D ${fmtOdd(m.odds.loss)} → ${resultPoints(m, 'V')}/${resultPoints(m, 'N')}/${resultPoints(m, 'D')} pts`
      : 'sans cotes'
  )
  if (m.score) parts.push(`score ${formatScore(m.score)} (${m.result})`)
  return parts.join(' · ')
}

async function findMatch(journee: number): Promise<Match | undefined> {
  return (await getData()).matches.find(m => m.journee === journee)
}

const journee = z.number().int().min(1).max(30).describe('Numéro de journée (1 à 30)')

const handler = createMcpHandler(
  server => {
    server.registerTool(
      'lister_matchs',
      {
        title: 'Lister les matchs du Raja',
        description: 'Liste les matchs du Raja (Botola Pro 2026-27) avec date, statut reporté, cotes et score. À appeler en premier pour retrouver le numéro de journée d\'un match.',
        inputSchema: z.object({
          filtre: z.enum(['a_venir', 'sans_cotes', 'joues', 'tous']).default('a_venir')
            .describe('a_venir : non joués ; sans_cotes : non joués sans cotes ; joues : avec score ; tous'),
        }),
      },
      async ({ filtre }) => {
        const { matches } = await getData()
        const selected = matches.filter(m =>
          filtre === 'tous' ? true
          : filtre === 'joues' ? m.score !== null
          : filtre === 'sans_cotes' ? m.score === null && !m.odds
          : m.score === null
        )
        return text(selected.length ? selected.map(describeMatch).join('\n') : 'Aucun match.')
      }
    )

    server.registerTool(
      'definir_cotes',
      {
        title: 'Définir les cotes d\'un match',
        description: `Enregistre les cotes décimales d'un match du point de vue du Raja (victoire Raja / nul / défaite Raja). Points d'un bon résultat = cote × 10, score exact = +${EXACT_BONUS}. Les cotes sont figées au coup d'envoi.`,
        inputSchema: z.object({
          journee,
          victoire_raja: z.number().min(1.01).max(100).describe('Cote décimale de la victoire du Raja, ex. 1.70'),
          nul: z.number().min(1.01).max(100).describe('Cote décimale du match nul, ex. 3.30'),
          defaite_raja: z.number().min(1.01).max(100).describe('Cote décimale de la défaite du Raja, ex. 4.70'),
        }),
      },
      async ({ journee, victoire_raja, nul, defaite_raja }) => {
        const res = await applyMatchUpdate(journee, { odds: { win: victoire_raja, draw: nul, loss: defaite_raja } })
        if (!res.ok) return { ...text(`Refusé : ${res.error}`), isError: true }
        const match = await findMatch(journee)
        return text(`Cotes enregistrées.\n${describeMatch(match!)}`)
      }
    )

    server.registerTool(
      'definir_date',
      {
        title: 'Définir la date d\'un match',
        description: 'Fixe le jour et l\'heure (heure marocaine) d\'un match, et/ou son statut reporté. Les pronos ferment au coup d\'envoi.',
        inputSchema: z.object({
          journee,
          jour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Jour au format YYYY-MM-DD'),
          heure: z.string().regex(/^\d{2}:\d{2}$/).optional().describe('Heure marocaine au format HH:MM'),
          reporte: z.boolean().optional().describe('true si le match est reporté'),
          sans_date: z.boolean().optional().describe('true pour retirer la date (match à programmer)'),
        }),
      },
      async ({ journee, jour, heure, reporte, sans_date }) => {
        if (heure && !jour) return { ...text('Indique aussi le jour (YYYY-MM-DD) avec l\'heure.'), isError: true }
        const update: { date?: string | null; postponed?: boolean } = {}
        if (sans_date) update.date = null
        else if (jour) update.date = heure ? `${jour}T${heure}` : jour
        if (reporte !== undefined) update.postponed = reporte
        if (!Object.keys(update).length) return { ...text('Rien à modifier : donne un jour, un statut reporté ou sans_date.'), isError: true }
        const res = await applyMatchUpdate(journee, update)
        if (!res.ok) return { ...text(`Refusé : ${res.error}`), isError: true }
        const match = await findMatch(journee)
        return text(`Match mis à jour.\n${describeMatch(match!)}`)
      }
    )

    server.registerTool(
      'saisir_score',
      {
        title: 'Saisir le score final',
        description: 'Enregistre le score final d\'un match du point de vue du Raja ; le résultat et les points des participants sont recalculés.',
        inputSchema: z.object({
          journee,
          buts_raja: z.number().int().min(0).max(20),
          buts_adversaire: z.number().int().min(0).max(20),
        }),
      },
      async ({ journee, buts_raja, buts_adversaire }) => {
        const match = await findMatch(journee)
        if (!match) return { ...text(`Match J${journee} introuvable`), isError: true }
        const score = match.lieu === 'Domicile'
          ? { home: buts_raja, away: buts_adversaire }
          : { home: buts_adversaire, away: buts_raja }
        const res = await applyMatchUpdate(journee, { score })
        if (!res.ok) return { ...text(`Refusé : ${res.error}`), isError: true }
        return text(`Score enregistré.\n${describeMatch((await findMatch(journee))!)}`)
      }
    )

    server.registerTool(
      'effacer_score',
      {
        title: 'Effacer le score',
        description: 'Retire le score final d\'un match (en cas d\'erreur de saisie).',
        inputSchema: z.object({ journee }),
      },
      async ({ journee }) => {
        const res = await applyMatchUpdate(journee, { score: null })
        if (!res.ok) return { ...text(`Refusé : ${res.error}`), isError: true }
        return text(`Score de J${journee} effacé.`)
      }
    )

    server.registerTool(
      'classement',
      {
        title: 'Classement des participants',
        description: 'Classement actuel des participants (points, scores exacts, bons résultats) et nombre de pronos sur le prochain match.',
        inputSchema: z.object({}),
      },
      async () => {
        const { users, matches } = await getData()
        if (!users.length) return text('Aucun participant pour l\'instant.')
        const board = calculateLeaderboard(users, matches)
        const lines = board.map((s, i) => `${i + 1}. ${s.userName} — ${s.totalPoints} pts (${s.exactCount} exacts, ${s.resultCount} bons résultats)`)
        const next = matches.filter(m => isOpenForPredictions(m)).find(m => m.date) ?? matches.find(m => m.score === null)
        if (next) {
          const count = users.filter(u => u.predictions[String(next.journee)]).length
          lines.push('', `Prochain match J${next.journee} : ${count}/${users.length} participants ont pronostiqué.`)
        }
        return text(lines.join('\n'))
      }
    )
  },
  { serverInfo: { name: 'solidprono', version: '1.0.0' } }
)

function isValidSecret(secret: string): boolean {
  const expected = process.env.MCP_SECRET
  if (!expected || secret.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
}

async function guarded(req: Request, ctx: { params: Promise<{ secret: string }> }) {
  const { secret } = await ctx.params
  if (!isValidSecret(secret)) return new Response('Not found', { status: 404 })
  return handler(req)
}

export { guarded as GET, guarded as POST, guarded as DELETE }
