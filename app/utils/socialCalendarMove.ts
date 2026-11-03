import type { SocialPost } from '../../shared/types/socialEditorial'
import { isSocialDateKey, isoToZurichLocal, zurichLocalToIso } from '#shared/utils/socialDateTime'

type SocialPostMoveResult =
  | { ok: true, plannedAt: string | null, unchanged: boolean }
  | { ok: false, error: string }

export function canMoveSocialPost(post: Pick<SocialPost, 'status'>): boolean {
  return post.status === 'draft' || post.status === 'failed'
}

/** Changes the editorial date only; publication still requires separate approval. */
export function resolveSocialPostMove(post: Pick<SocialPost, 'status' | 'planned_at'>, targetDate: string | null): SocialPostMoveResult {
  if (!canMoveSocialPost(post)) {
    return { ok: false, error: 'Seuls les brouillons et les publications en échec peuvent être déplacés.' }
  }
  if (targetDate === null) {
    return { ok: true, plannedAt: null, unchanged: post.planned_at === null }
  }
  if (!isSocialDateKey(targetDate)) {
    return { ok: false, error: 'La date choisie est invalide.' }
  }

  const currentLocal = isoToZurichLocal(post.planned_at)
  if (post.planned_at !== null && !currentLocal) {
    return { ok: false, error: 'La date actuelle est invalide. Corrige-la dans le brouillon avant de le déplacer.' }
  }
  // Preserve the exact instant on the same Swiss day, including repeated DST minutes.
  if (currentLocal.slice(0, 10) === targetDate) {
    return { ok: true, plannedAt: post.planned_at, unchanged: true }
  }

  const localTime = currentLocal ? currentLocal.slice(11, 16) : '18:00'
  const plannedAt = zurichLocalToIso(`${targetDate}T${localTime}`)
  if (!plannedAt) {
    return { ok: false, error: 'Cette heure est inexistante ou ambiguë à cause du changement d’heure en Suisse. Choisis une autre heure dans le brouillon.' }
  }
  return { ok: true, plannedAt, unchanged: false }
}
