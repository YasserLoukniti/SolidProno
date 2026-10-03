import { getData, updateMatch, type MatchUpdate } from '@/lib/storage'
import { OPPONENTS, buildAdversaire, getOpponent } from '@/data/teams'
import { isValidOdds, isValidScore, scoreToResult } from '@/data/scoring'
import { kickoffTime } from '@/data/dates'

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/

export type MatchUpdateResult = { ok: true } | { ok: false; error: string; status: number }

const fail = (error: string, status = 400): MatchUpdateResult => ({ ok: false, error, status })

// Validation et écriture d'une modification de match, partagées par l'admin et le serveur MCP
export async function applyMatchUpdate(journee: number, body: MatchUpdate): Promise<MatchUpdateResult> {
  const current = (await getData()).matches.find(m => m.journee === journee)
  if (!current) return fail(`Match J${journee} introuvable`, 404)

  const update: MatchUpdate = {}

  if ('score' in body) {
    if (body.score !== null && !isValidScore(body.score)) return fail('Score invalide')
    update.score = body.score ? { home: body.score.home, away: body.score.away } : null
  }

  if ('date' in body) {
    if (body.date !== null && !DATE_FORMAT.test(body.date as string)) return fail('Date invalide (attendu YYYY-MM-DD ou YYYY-MM-DDTHH:mm)')
    update.date = body.date
  }

  if ('postponed' in body) {
    if (typeof body.postponed !== 'boolean') return fail('Statut reporté invalide')
    update.postponed = body.postponed
  }

  if ('adversaire' in body || 'lieu' in body) {
    const opponent = body.adversaire ? getOpponent(body.adversaire) : ''
    if (!OPPONENTS.includes(opponent) || !['Domicile', 'Extérieur'].includes(body.lieu as string)) {
      return fail('Adversaire ou lieu invalide')
    }
    update.lieu = body.lieu
    update.adversaire = buildAdversaire(opponent, body.lieu!)
  }

  if ('odds' in body) {
    if (body.odds !== null && !isValidOdds(body.odds)) return fail('Cotes invalides (nombres décimaux entre 1.01 et 100)')
    // Les cotes sont figées au coup d'envoi ; on peut seulement compléter des cotes oubliées
    const kickoff = kickoffTime(update.date !== undefined ? update.date : current.date)
    if (current.odds && kickoff !== null && Date.now() >= kickoff) {
      return fail(`Cotes de J${journee} figées depuis le coup d'envoi`, 409)
    }
    update.odds = body.odds ? { win: body.odds.win, draw: body.odds.draw, loss: body.odds.loss } : null
  }

  // Le résultat est toujours déduit du score et du lieu
  const score = 'score' in update ? update.score : current.score
  update.result = score ? scoreToResult(score, update.lieu ?? current.lieu) : null

  const found = await updateMatch(journee, update)
  return found ? { ok: true } : fail(`Match J${journee} introuvable`, 404)
}
