export type InstagramSnapshot = {
  schemaVersion: 1
  expectedUsername: 'antoinequarroz.dev'
  state: 'connected' | 'partial' | 'error' | 'unconfigured' | 'wrong_account' | 'permission_required'
  readOnly: true
  publishingEnabled: false
  collectedAt: string
  lastSuccessfulAt: string | null
  period: { from: string, to: string } | null
  profile: { id: string, username: 'antoinequarroz.dev', followers: number | null, mediaCount: number | null } | null
  metrics: { reach: number | null, accounts_engaged: number | null, total_interactions: number | null }
  media: { id: string, caption: string, type: string, url: string, publishedAt: string | null, likes: number | null, comments: number | null }[]
  errors: string[]
  chargedMicroUSD: 0
}
export type SocialInsightsResponse = { instagram: InstagramSnapshot | null, receivedAt: string | null }
export type SocialSiteResponse = {
  configured: boolean
  available: boolean
  measuredAt: string
  periodDays: 30
  rows: { platform: 'instagram' | 'linkedin' | 'x', visitors: number | null, pageviews: number | null }[]
}
