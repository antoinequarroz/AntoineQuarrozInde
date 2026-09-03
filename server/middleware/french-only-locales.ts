import { defineEventHandler, sendRedirect } from 'h3'
import { getFrenchOnlyRedirectLocation } from '../../shared/utils/localizedRoutePolicy'

export default defineEventHandler((event) => {
  const rawRequestTarget = event.node.req.originalUrl
  if (!rawRequestTarget) return

  const location = getFrenchOnlyRedirectLocation(rawRequestTarget)
  if (location === null) return

  return sendRedirect(event, location, 308)
})
