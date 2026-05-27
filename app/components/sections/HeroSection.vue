<script setup lang="ts">
const { t } = useI18n()
const { variant, initVariant, track } = useMarketing()

onMounted(() => {
  initVariant()
  track('hero_view')
})
</script>

<template>
  <section id="hero" class="relative min-h-screen w-full flex items-center justify-center overflow-hidden hero-frame">
    <div class="absolute inset-0 hero-glow" />

    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="shape shape-1" />
      <div class="shape shape-2" />
      <div class="shape shape-3" />
      <div class="shape shape-4" />
      <div class="shape shape-5" />
    </div>

    <div class="relative z-10 section-container text-center pt-28 pb-20">
      <div class="max-w-4xl mx-auto">
        <div
          v-motion
          :initial="{ opacity: 0, y: 24 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 120, duration: 700 } }"
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-white/[0.04] border border-gray-300/40 dark:border-white/[0.15] mb-8"
        >
          <span class="w-2 h-2 rounded-full bg-fuchsia-500" />
          <span class="text-sm text-gray-700 dark:text-gray-300 tracking-wide">{{ t('hero.badge') }}</span>
        </div>

        <h1
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 220, duration: 850 } }"
          class="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold mb-7 tracking-tight"
        >
          <span class="block bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-700 dark:from-white dark:to-white/80">
            {{ t(`hero.variant_${variant.toLowerCase()}.title_1`) }}
          </span>
          <span class="block bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-white to-fuchsia-300 dark:from-violet-300 dark:via-white dark:to-fuchsia-300">
            {{ t(`hero.variant_${variant.toLowerCase()}.title_2`) }}
          </span>
          <span class="block bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-700 dark:from-white dark:to-white/80">
            {{ t(`hero.variant_${variant.toLowerCase()}.title_3`) }}
          </span>
        </h1>

        <p
          v-motion
          :initial="{ opacity: 0, y: 24 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 320, duration: 700 } }"
          class="text-base sm:text-lg md:text-xl text-gray-600 dark:text-white/55 mb-10 leading-relaxed max-w-2xl mx-auto"
        >
          {{ t(`hero.variant_${variant.toLowerCase()}.subtitle`) }}
        </p>

        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 420, duration: 650 } }"
          class="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a href="/#contact" class="btn-primary text-base px-8 py-4" @click="track('hero_cta_primary_click')">
            {{ t('hero.cta_primary') }}
          </a>
          <a href="/#portfolio" class="btn-secondary text-base px-8 py-4" @click="track('hero_cta_secondary_click')">
            {{ t('hero.cta_secondary') }}
          </a>
        </div>
      </div>
    </div>

    <div class="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-white/30 dark:from-[#030303] dark:via-transparent dark:to-[#030303]/70 pointer-events-none" />
  </section>
</template>

<style scoped>
.hero-frame {
  background: #f8f8fb;
}

:global(.dark) .hero-frame {
  background: #030303;
}

.hero-glow {
  background: linear-gradient(to bottom right, rgba(99, 102, 241, 0.07), transparent, rgba(244, 114, 182, 0.07));
  filter: blur(40px);
}

.shape {
  position: absolute;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(2px);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.08);
  animation: drift 12s ease-in-out infinite;
}

.shape::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.18), transparent 70%);
}

.shape-1 {
  width: 600px;
  height: 140px;
  left: -10%;
  top: 18%;
  transform: rotate(12deg);
  background: linear-gradient(to right, rgba(99, 102, 241, 0.16), transparent);
}

.shape-2 {
  width: 500px;
  height: 120px;
  right: -5%;
  top: 74%;
  transform: rotate(-15deg);
  background: linear-gradient(to right, rgba(244, 114, 182, 0.16), transparent);
  animation-delay: 0.4s;
}

.shape-3 {
  width: 300px;
  height: 80px;
  left: 7%;
  bottom: 9%;
  transform: rotate(-8deg);
  background: linear-gradient(to right, rgba(139, 92, 246, 0.15), transparent);
  animation-delay: 0.25s;
}

.shape-4 {
  width: 200px;
  height: 60px;
  right: 18%;
  top: 12%;
  transform: rotate(20deg);
  background: linear-gradient(to right, rgba(245, 158, 11, 0.15), transparent);
  animation-delay: 0.55s;
}

.shape-5 {
  width: 150px;
  height: 40px;
  left: 24%;
  top: 8%;
  transform: rotate(-25deg);
  background: linear-gradient(to right, rgba(34, 211, 238, 0.15), transparent);
  animation-delay: 0.8s;
}

:global(.dark) .shape {
  border-color: rgba(255, 255, 255, 0.12);
}

@keyframes drift {
  0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
  50% { transform: translateY(15px) rotate(var(--rot, 0deg)); }
}

.shape-1 { --rot: 12deg; }
.shape-2 { --rot: -15deg; }
.shape-3 { --rot: -8deg; }
.shape-4 { --rot: 20deg; }
.shape-5 { --rot: -25deg; }

@media (max-width: 768px) {
  .shape-1 { width: 360px; height: 90px; top: 16%; }
  .shape-2 { width: 300px; height: 80px; top: 78%; }
  .shape-3 { width: 190px; height: 54px; left: 6%; }
  .shape-4 { width: 120px; height: 38px; right: 7%; }
  .shape-5 { width: 92px; height: 28px; left: 18%; }
}
</style>
