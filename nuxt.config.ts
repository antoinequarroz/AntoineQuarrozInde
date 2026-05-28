export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@vueuse/nuxt',
    '@vueuse/motion/nuxt',
  ],

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'dark',
  },

  i18n: {
    locales: [
      { code: 'fr', iso: 'fr-CH', name: 'FranÃ§ais' },
      { code: 'en', iso: 'en-US', name: 'English' },
      { code: 'de', iso: 'de-CH', name: 'Deutsch' },
    ],
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    vueI18n: './i18n.config.ts',
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      titleTemplate: '%s',
      title: 'Antoine Quarroz â€” DÃ©veloppeur Web en Valais',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Antoine Quarroz, dÃ©veloppeur web & mobile freelance basÃ© en Valais (Suisse). CrÃ©ation de sites web, applications mobiles et CMS sur mesure.',
        },
        { name: 'format-detection', content: 'telephone=no' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Antoine Quarroz' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    contactEmail: process.env.CONTACT_EMAIL || 'info@antoinequarroz.ch',
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    adminEmail: process.env.ADMIN_EMAIL || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://www.antoinequarroz.dev',
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    },
  },

  typescript: {
    strict: true,
  },
})

