<script setup lang="ts">
const { t } = useI18n()
const store = useArticlesStore()

const articles = computed(() => store.published.slice(0, 3))

const stackItems = computed(() =>
  articles.value.map(article => ({
    id: article.id,
    title: article.title,
    description: article.excerpt,
    imageSrc: article.coverImage,
    href: `/blog/${article.slug}`,
    ctaLabel: t('blog.read'),
    tag: article.tags?.[0] || 'Article',
    readTime: article.readTime,
    content: article.content,
    createdAt: article.createdAt,
  })),
)

const selectedArticle = ref<null | (typeof stackItems.value[number])>(null)

function openArticlePreview(item: (typeof stackItems.value[number])) {
  selectedArticle.value = item
}

function closeArticlePreview() {
  selectedArticle.value = null
}
</script>

<template>
  <section v-if="articles.length" id="blog" class="section-padding section-surface">
    <div class="section-background">
      <div class="section-grid" />
    </div>

    <div class="section-container relative z-10">
      <!-- Header -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 30 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 600 } }"
        class="section-header"
      >
        <span class="badge mb-4">{{ t('blog.badge') }}</span>
        <h2 class="section-heading">
          <span class="block">{{ t('blog.title').split('\n')[0] }}</span>
          <span class="block section-heading-gradient">{{ t('blog.title').split('\n')[1] }}</span>
        </h2>
        <p class="section-subtitle mx-auto max-[430px]:max-w-[32ch]">{{ t('blog.subtitle') }}</p>
        <NuxtLink to="/blog" class="btn-secondary mt-5 text-xs md:text-sm px-4 md:px-5 py-2 md:py-2.5">
          {{ t('blog.view_all') }}
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </NuxtLink>
      </div>

      <div
        v-motion
        :initial="{ opacity: 0, y: 24 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 700 } }"
      >
        <UiCardStack
          :items="stackItems"
          :initial-index="0"
          :max-visible="5"
          :auto-advance="true"
          :interval-ms="3000"
          @card-click="openArticlePreview"
        />
      </div>
      <div class="mt-6 grid sm:grid-cols-3 gap-2.5">
        <div
          v-for="article in articles"
          :key="`meta-${article.id}`"
          class="rounded-xl border border-violet-300/20 bg-white/60 dark:bg-white/[0.04] px-3 py-2"
        >
          <p class="text-xs text-gray-500 dark:text-white/50">{{ article.createdAt }}</p>
          <p class="text-[13px] md:text-sm font-semibold text-gray-900 dark:text-white mt-0.5 line-clamp-1">{{ article.title }}</p>
        </div>
      </div>
    </div>

    <Transition name="article-modal">
      <div
        v-if="selectedArticle"
        class="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="closeArticlePreview"
      >
        <article class="w-full max-w-3xl max-h-[82vh] overflow-hidden rounded-2xl border border-violet-300/25 bg-[#0a0d1c] shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
          <div class="flex items-start justify-between gap-4 p-5 border-b border-white/10">
            <div>
              <p class="text-xs text-violet-300/85">{{ selectedArticle.createdAt }} · {{ selectedArticle.readTime }} min</p>
              <h3 class="mt-1 font-display text-2xl font-bold text-white leading-tight">{{ selectedArticle.title }}</h3>
            </div>
            <button
              type="button"
              class="w-9 h-9 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition"
              aria-label="Fermer"
              @click="closeArticlePreview"
            >
              ✕
            </button>
          </div>

          <div class="p-5 overflow-y-auto max-h-[52vh] no-scrollbar">
            <p class="text-sm text-white/75 leading-relaxed mb-4">{{ selectedArticle.description }}</p>
            <div class="whitespace-pre-line text-[15px] text-white/88 leading-relaxed">
              {{ selectedArticle.content }}
            </div>
          </div>

          <div class="p-5 border-t border-white/10 flex items-center justify-between">
            <span class="text-xs text-white/55">{{ t('blog.preview') }}</span>
            <NuxtLink
              :to="selectedArticle.href || '/blog'"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition"
              @click="closeArticlePreview"
            >
              {{ t('blog.open') }}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </NuxtLink>
          </div>
        </article>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.article-modal-enter-active,
.article-modal-leave-active {
  transition: opacity 0.2s ease;
}
.article-modal-enter-from,
.article-modal-leave-to {
  opacity: 0;
}
</style>
