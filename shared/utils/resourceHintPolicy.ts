type BuildResourceManifest = Record<string, {
  src?: string
  isDynamicEntry?: boolean
  prefetch?: boolean
}>

export function deferAccountSdkResourceHints(manifest: BuildResourceManifest) {
  for (const [id, chunk] of Object.entries(manifest)) {
    const source = (chunk.src ?? id).replace(/\\/g, '/')
    if (chunk.isDynamicEntry && /(?:^|\/)node_modules\/@supabase\/supabase-js\//.test(source)) {
      // Nuxt turns dynamic-import manifest entries into SSR prefetch hints.
      // Keep the SDK's runtime import and normal private-page preloads intact.
      chunk.prefetch = false
    }
  }
}
