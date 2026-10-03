import type { UserScore } from '@/types'

export interface RankedScore extends UserScore {
  rank: number
}

// Classement « olympique » : mêmes points et mêmes scores exacts = même rang (1, 2, 2, 4…)
export function withRanks(board: UserScore[]): RankedScore[] {
  let rank = 0
  return board.map((entry, i) => {
    const prev = board[i - 1]
    if (!prev || prev.totalPoints !== entry.totalPoints || prev.exactCount !== entry.exactCount) rank = i + 1
    return { ...entry, rank }
  })
}

// 1er, 2e, 3e…
export function ordinal(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`
}

// 0 pt, 1 pt, 2 pts
export function ptsLabel(points: number): string {
  return points > 1 ? 'pts' : 'pt'
}
