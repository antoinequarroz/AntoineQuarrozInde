import { randomUUID } from 'node:crypto'
import { isStrictSocialVideoBucket, MAX_SOCIAL_VIDEO_REQUEST_BYTES, validateSocialVideoDataUrl } from '../../utils/socialVideoUpload'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_SOCIAL_VIDEO_REQUEST_BYTES)
  const video = await validateSocialVideoDataUrl(body.dataUrl)
  const db = getSupabaseAdmin()
  const { data: bucket, error: bucketError } = await db.storage.getBucket('social-videos')
  if (bucketError || !isStrictSocialVideoBucket(bucket as unknown as Record<string, unknown>)) {
    throw createError({ statusCode: 503, message: 'Le stockage vidéo sécurisé n’est pas configuré.' })
  }
  const filePath = `uploads/${org.id}/${randomUUID()}.mp4`
  const { error } = await db.storage.from('social-videos').upload(filePath, video.buffer, { contentType: video.mime, upsert: false })
  if (error) throw createError({ statusCode: 500, message: 'Le téléversement vidéo a échoué.' })
  const { data } = db.storage.from('social-videos').getPublicUrl(filePath)
  return { url: data.publicUrl, width: video.width, height: video.height, duration: video.duration }
})
