import { describe, expect, it } from 'vitest'
import { normalizeViteManifest, precomputeDependencies } from 'vue-bundle-renderer'
import { createRendererContext, renderResourceHeaders, renderResourceHints } from 'vue-bundle-renderer/runtime'
import { deferAccountSdkResourceHints } from '../shared/utils/resourceHintPolicy'

function manifest() {
  return normalizeViteManifest({
    'app/entry.ts': {
      file: 'entry.js', isEntry: true,
      imports: ['shared-helper'],
      dynamicImports: ['sdk', 'public-page'],
    },
    sdk: {
      file: 'account-hash.js', isDynamicEntry: true,
      src: '../../worktree/node_modules/@supabase/supabase-js/dist/index.mjs',
      imports: ['shared-helper'],
    },
    'shared-helper': { file: 'shared-helper.js' },
    'public-page': { file: 'public-page.js', isDynamicEntry: true, src: 'pages/blog.vue', css: ['blog.css'] },
  })
}

function resources(buildManifest: ReturnType<typeof manifest>, precomputed = false) {
  const context = createRendererContext({
    ...(precomputed ? { precomputed: precomputeDependencies(buildManifest) } : { manifest: buildManifest }),
    buildAssetsURL: file => `/_nuxt/${file}`,
  })
  const ssrContext = { modules: new Set<string>() }
  return {
    html: renderResourceHints(ssrContext, context),
    headers: renderResourceHeaders(ssrContext, context),
  }
}

describe('on-demand account SDK resource hints', () => {
  it.each([false, true])('removes the actual renderer prefetch, including precomputed mode %s, while retaining public hints', (precomputed) => {
    const buildManifest = manifest()
    expect(resources(buildManifest, precomputed).html).toContain('account-hash.js')
    deferAccountSdkResourceHints(buildManifest)
    const rendered = resources(buildManifest, precomputed)

    expect(rendered.html).not.toContain('account-hash.js')
    expect(JSON.stringify(rendered.headers)).not.toContain('account-hash.js')
    expect(rendered.html).toContain('rel="modulepreload" as="script" crossorigin href="/_nuxt/entry.js"')
    expect(rendered.html).toContain('public-page.js')
    expect(rendered.html).toContain('blog.css')
    expect(buildManifest.sdk!.preload).toBe(true)
    expect(buildManifest['app/entry.ts']!.dynamicImports).toEqual(['sdk', 'public-page'])
    expect(buildManifest.sdk!.imports).toEqual(['shared-helper'])
  })

  it('uses the package source independently of hashed output filenames and platform separators', () => {
    const buildManifest = normalizeViteManifest({
      'node_modules/@supabase/supabase-js/dist/index.mjs': { file: 'changed-hash.js', isDynamicEntry: true },
      windows: { file: 'windows-hash.js', src: 'C:\\repo\\node_modules\\@supabase\\supabase-js\\dist\\index.mjs', isDynamicEntry: true },
      static: { file: 'static.js', src: 'node_modules/@supabase/supabase-js/dist/index.mjs' },
      authPage: { file: 'login.js', src: 'pages/admin/login.vue', isDynamicEntry: true },
    })
    deferAccountSdkResourceHints(buildManifest)

    expect(buildManifest['node_modules/@supabase/supabase-js/dist/index.mjs']!.prefetch).toBe(false)
    expect(buildManifest.windows!.prefetch).toBe(false)
    expect(buildManifest.static!.prefetch).toBe(true)
    expect(buildManifest.authPage!.prefetch).toBe(true)
  })
})
