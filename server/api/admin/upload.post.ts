export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)

  const dataUrl = String(body.dataUrl || '')
  if (!dataUrl.startsWith('data:image/')) {
    throw createError({ statusCode: 400, message: 'Invalid image payload' })
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    throw createError({ statusCode: 400, message: 'Malformed data URL' })
  }

  const mime = match[1]
  const base64 = match[2]
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const filePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const buffer = Buffer.from(base64, 'base64')

  const supabase = getSupabaseAdmin()

  const { data: buckets } = await supabase.storage.listBuckets()
  const hasMediaBucket = buckets?.some(b => b.name === 'media')
  if (!hasMediaBucket) {
    const { error: bucketError } = await supabase.storage.createBucket('media', { public: true })
    if (bucketError && !bucketError.message.toLowerCase().includes('already')) {
      throw createError({ statusCode: 500, message: bucketError.message })
    }
  }

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, buffer, { contentType: mime, upsert: false })

  if (uploadError) {
    throw createError({ statusCode: 500, message: uploadError.message })
  }

  const { data } = supabase.storage.from('media').getPublicUrl(filePath)
  return { url: data.publicUrl }
})
