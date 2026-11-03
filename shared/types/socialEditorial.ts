export type EditorialSocialPlatform = 'linkedin' | 'x' | 'instagram'
export type EditorialSocialStatus = 'draft' | 'approved' | 'publishing' | 'published' | 'rejected' | 'failed'
export type EditorialSocialMediaItem = { type: 'image' | 'video', url: string, alt: string }

export type SocialPost = {
  id: string
  studioContentId: string | null
  platform: EditorialSocialPlatform
  article_title: string
  article_url: string
  content: string
  publication_mode: 'manual' | 'automatic'
  approved_version: number | null
  media_images: { url: string, alt: string }[]
  media_items?: EditorialSocialMediaItem[]
  media_kind: 'document' | null
  media_url: string | null
  media_title: string | null
  status: EditorialSocialStatus
  external_post_url: string | null
  last_error: string | null
  planned_at: string | null
  publish_after: string | null
  published_at: string | null
  version: number
  created_at: string
  updated_at: string
}
