export default defineEventHandler(async (event) => {
  requireHermesPublishAccess(event)
  const body = await readJsonBodyLimited(event, 128 * 1024)
  let snapshot, drafts
  try {
    snapshot = validateInstagramSnapshot(body.snapshot)
    drafts = validateInstagramDrafts(body.drafts)
  }
  catch { throw createError({ statusCode: 400, message: 'Relevé ou brouillons Instagram incompatibles.' }) }
  const organization = await resolveHermesOrganization()
  const supabase = getSupabaseAdmin()
  // All incoming editor status/revision fields are ignored. Existing rows,
  // including rejected drafts and approved text, are never overwritten.
  let imported = 0
  if (drafts.length) {
    const { data, error } = await supabase.from('social_posts').upsert(
      drafts.map(draft => ({ ...draft, organization_id: organization.id })),
      { onConflict: 'organization_id,platform,source_key', ignoreDuplicates: true },
    ).select('id')
    if (error) throw createError({ statusCode: 500, message: 'Import Instagram indisponible.' })
    imported = data?.length || 0
  }
  const { error } = await supabase.rpc('store_instagram_insight', {
    p_organization_id: organization.id, p_collected_at: snapshot.collectedAt, p_snapshot: snapshot,
  })
  if (error) throw createError({ statusCode: 500, message: 'Enregistrement du relevé Instagram indisponible.' })
  return { ok: true, imported, receivedDrafts: drafts.length }
})
