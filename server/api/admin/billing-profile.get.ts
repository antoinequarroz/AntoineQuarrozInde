export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('organizations')
    .select('billing_name, billing_street, billing_building, billing_postal_code, billing_city, billing_country, billing_email, billing_phone, billing_iban, billing_uid, billing_terms')
    .eq('id', org.id)
    .single()
  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
