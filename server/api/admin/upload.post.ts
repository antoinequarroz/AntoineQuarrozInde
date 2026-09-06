import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJsonBodyLimited(event, MAX_IMAGE_REQUEST_BYTES)
  const image = validateImageDataUrl(body.dataUrl)
  const filePath = `uploads/${Date.now()}-${randomUUID()}.${image.extension}`

  const supabase = getSupabaseAdmin()

  const { data: bucket, error: bucketError } = await supabase.storage.getBucket('media')
  if (bucketError || !isStrictMediaBucket(bucket as unknown as Record<string, unknown>)) {
    throw createError({
      statusCode: 503,
      message: 'Media storage is not configured with the required image restrictions',
    })
  }

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, image.buffer, { contentType: image.mime, upsert: false })

  if (uploadError) {
    throw createError({ statusCode: 500, message: uploadError.message })
  }

  const { data } = supabase.storage.from('media').getPublicUrl(filePath)
  return { url: data.publicUrl }
})
