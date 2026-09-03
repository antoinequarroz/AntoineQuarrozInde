export function buildRobotsPolicy(siteUrl: string) {
  const origin = siteUrl.replace(/\/+$/, '')

  return `User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`
}
