import { createHash } from 'node:crypto'
import { IA_PME_LEAD_MAGNET_SLUG } from './leadMagnetAccess'

type LeadMagnetEmailInput = {
  email: string
  slug: typeof IA_PME_LEAD_MAGNET_SLUG
  downloadUrl: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function buildLeadMagnetEmail(input: LeadMagnetEmailInput, siteUrl: string) {
  const origin = siteUrl.replace(/\/+$/, '')
  const downloadUrl = new URL(input.downloadUrl, `${origin}/`).toString()
  const safeDownloadUrl = escapeHtml(downloadUrl)

  return {
    subject: 'Votre checklist pour cadrer un pilote IA de 30 jours',
    text: [
      'Bonjour,',
      '',
      'Voici la checklist demandée pour cadrer un premier pilote IA dans une PME.',
      '',
      `Télécharger le PDF : ${downloadUrl}`,
      '',
      'Le lien reste valable pendant 24 heures. Vous recevrez séparément la demande de confirmation de votre inscription à la newsletter.',
      '',
      'Antoine Quarroz',
      'PME · IA · Outils métier',
    ].join('\n'),
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#080810;color:#f8fafc;font-family:Inter,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Votre checklist pratique pour lancer un pilote IA de 30 jours.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080810;padding:28px 14px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid #4338ca;border-radius:24px;background:#11111b;overflow:hidden;">
          <tr><td style="padding:34px 34px 12px;">
            <p style="margin:0 0 18px;color:#22d3ee;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">AQ · Checklist PME</p>
            <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.15;">Votre pilote IA commence par un cadre clair.</h1>
            <p style="margin:18px 0 0;color:#cbd5e1;font-size:16px;line-height:1.65;">La checklist rassemble les décisions à prendre avant d’utiliser des données réelles : cas d’usage, classification, outil approuvé, validation humaine et mesure avant/après.</p>
          </td></tr>
          <tr><td style="padding:20px 34px 12px;">
            <a href="${safeDownloadUrl}" style="display:block;border-radius:12px;background:#7c3aed;color:#ffffff;font-size:16px;font-weight:700;text-align:center;text-decoration:none;padding:16px 22px;">Télécharger la checklist PDF</a>
            <p style="margin:14px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">Ce lien sécurisé reste valable pendant 24 heures.</p>
          </td></tr>
          <tr><td style="padding:22px 34px 34px;">
            <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.65;">LuMail vous enverra séparément la confirmation de votre inscription à la newsletter. Après confirmation, vous recevrez les prochains guides pratiques et pourrez vous désinscrire à tout moment.</p>
            <p style="margin:22px 0 0;color:#ffffff;font-size:14px;line-height:1.5;"><strong>Antoine Quarroz</strong><br><span style="color:#22d3ee;">PME · IA · Outils métier</span></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
    idempotencyKey: `lead-magnet:${input.slug}:${createHash('sha256').update(`${input.email}\n${downloadUrl}`).digest('hex').slice(0, 40)}`,
  }
}

export async function sendLeadMagnetEmail(input: LeadMagnetEmailInput) {
  const config = useRuntimeConfig()
  const message = buildLeadMagnetEmail(input, String(config.public.siteUrl || 'https://www.antoinequarroz.ch'))
  return sendAppEmail({
    to: input.email,
    subject: message.subject,
    text: message.text,
    html: message.html,
    idempotencyKey: message.idempotencyKey,
    tags: [{ name: 'category', value: 'lead_magnet' }],
  })
}
