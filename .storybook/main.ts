import type { StorybookConfig } from '@storybook/vue3-vite'
import { fileURLToPath } from 'node:url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import vue from '@vitejs/plugin-vue'
import tailwind from '../tailwind.config.ts'
import AutoImport from 'unplugin-auto-import/vite'

const root = fileURLToPath(new URL('../', import.meta.url))
const config: StorybookConfig = {
  framework: '@storybook/vue3-vite',
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],
  staticDirs: ['./public'],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      plugins: [
        {
          name: 'aq-storybook-local-fetch', enforce: 'pre',
          transform(code, id) {
            if (id.endsWith('.vue') && id.includes('/app/components/') && code.includes('$fetch')) {
              return code.replace(/(<script setup[^>]*>)/, '$1\nimport { useDemoFetch } from "' + root + '.storybook/runtime";\nconst $fetch = useDemoFetch();')
            }
          },
        },
        vue({ template: { compilerOptions: { isCustomElement: tag => tag === 'spline-viewer' } } }),
        AutoImport({
          include: [/\/app\/.*\.(vue|ts)$/, /\.vue\?vue/],
          imports: ['vue', { '@vueuse/core': ['useWindowScroll', 'useWindowSize', 'useElementBounding'] },
            { [root + '.storybook/runtime']: ['useI18n', 'useColorMode', 'useRoute', 'useLocalePath', 'useLocaleRoute', 'useRouteBaseName', 'useSwitchLocalePath', 'useRuntimeConfig', 'useMarketing', 'usePlausibleEvent', 'captureLeadAttribution', 'useHead', 'useAsyncData', 'useAuthStore', 'useClientsStore', 'useProjectsStore', 'useQuotesStore', 'useInvoicesStore', 'useTasksStore', 'useArticlesStore', 'useReviewsStore', 'useGoogleReviewsStore'] },
            { [root + 'app/composables/useToast']: ['useToast'] },
            { [root + 'app/composables/useAccessibleDialog']: ['useAccessibleDialog'] }],
          dts: false,
        }),
      ],
      resolve: { alias: { '~~': root, '~': `${root}app`, '@': `${root}app` } },
      define: { 'import.meta.client': true, 'import.meta.server': false },
      css: { postcss: { plugins: [tailwindcss({ ...tailwind, content: [...tailwind.content as string[], './stories/**/*.{vue,ts,mdx}', './.storybook/**/*.{ts,vue}'] }), autoprefixer()] } },
      build: { sourcemap: false },
    })
  },
}
export default config
