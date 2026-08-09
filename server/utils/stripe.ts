import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeClient() {
  const config = useRuntimeConfig()
  const secretKey = String(config.stripeSecretKey || '')
  if (!secretKey) throw createError({ statusCode: 503, message: 'Le paiement TWINT n’est pas encore activé.' })
  stripeClient ||= new Stripe(secretKey, { maxNetworkRetries: 2 })
  return stripeClient
}
