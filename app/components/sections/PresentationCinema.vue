<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const presentation = shallowRef<{ pauseVideo: () => void } | null>(null)

const copy = computed(() => {
  if (locale.value === 'en') return { badge: 'In video', title: 'An idea.', accent: 'Made real.', subtitle: 'Discover my work in 50 seconds.', design: 'Design', code: 'Code', experience: 'Experience', scroll: 'Scroll to discover' }
  if (locale.value === 'de') return { badge: 'Im Video', title: 'Eine Idee.', accent: 'Dann wird sie Realität.', subtitle: 'Meine Arbeit in 50 Sekunden entdecken.', design: 'Design', code: 'Code', experience: 'Erlebnis', scroll: 'Scrollen und entdecken' }
  return { badge: 'En vidéo', title: 'Une idée.', accent: 'Puis du concret.', subtitle: 'Mon travail en 50 secondes.', design: 'Design', code: 'Code', experience: 'Expérience', scroll: 'Défiler pour découvrir' }
})
// Two long rows so the drift never runs out of words; one filled word per row.
const wordRows = computed(() => {
  const labels = [copy.value.design, copy.value.code, copy.value.experience]
  const row = (start: number, accent: number) => Array.from({ length: 9 }, (_, index) => ({ label: labels[(start + index) % 3]!, accent: index === accent }))
  return [row(0, 3), row(2, 6)]
})
</script>

<template>
  <section id="presentation" class="presentation-cinema" aria-labelledby="presentation-title">
    <UiVideoScrollHero>
      <template #heading>
        <div class="presentation-cinema__heading">
          <span class="badge mb-4">{{ copy.badge }}</span>
          <h2 id="presentation-title" class="section-heading">
            <span class="block">{{ copy.title }}</span>
            <span class="block section-heading-gradient">{{ copy.accent }}</span>
          </h2>
          <p class="section-subtitle mx-auto">{{ copy.subtitle }}</p>
        </div>
      </template>
      <template #intro>
        <div class="cinema-scene">
          <!-- Oversized words drift in opposite directions behind the film, which grows over them. -->
          <div class="cinema-scene__words">
            <p v-for="(row, index) in wordRows" :key="index" class="cinema-scene__row" :class="`cinema-scene__row--${index ? 'reverse' : 'forward'}`">
              <template v-for="(word, position) in row" :key="position">
                <span :class="{ 'cinema-scene__word--accent': word.accent }">{{ word.label }}</span><i />
              </template>
            </p>
          </div>
          <div class="cinema-scene__cue">
            <span>{{ copy.scroll }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m-5-5 5 5 5-5" /></svg>
          </div>
        </div>
      </template>
      <template #default="{ controlsTarget }">
        <SectionsAboutVideo ref="presentation" :controls-target="controlsTarget" external-controls />
      </template>
    </UiVideoScrollHero>
    <div class="presentation-cinema__after">
        <NuxtLink :to="`${localePath('/')}#contact-form`" class="presentation-cinema__contact" @click="presentation?.pauseVideo()">
          {{ t('about.contact_link') }}
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.presentation-cinema { background: radial-gradient(ellipse at 50% 48%, rgb(124 58 237 / .1), transparent 65%); }
/* A small scene around the film disperses with the same native scroll. */
.cinema-scene { position: absolute; inset: 0; --scene-exit: var(--video-scroll-scene-exit, 0); --scene-arrival: var(--video-scroll-entry-y, 0px); }
.cinema-scene__words { position: absolute; inset-inline: 0; top: 50%; display: grid; gap: clamp(8px, 1.6vw, 22px); transform: translateY(calc(-34% + var(--scene-arrival))); }
.cinema-scene__row { display: flex; align-items: center; width: max-content; margin: 0; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: clamp(64px, 11vw, 150px); font-weight: 700; line-height: 1; letter-spacing: -.03em; white-space: nowrap; color: transparent; -webkit-text-stroke: 1.2px rgb(124 58 237 / .32); will-change: transform; }
.cinema-scene__row--forward { transform: translate3d(calc(-33.333% + 4vw - var(--scene-exit) * 26vw), 0, 0); }
.cinema-scene__row--reverse { transform: translate3d(calc(-55% + var(--scene-exit) * 26vw), 0, 0); }
.cinema-scene__row i { width: .22em; height: .22em; margin-inline: .16em; border: 1.2px solid rgb(217 70 239 / .45); border-radius: 50%; }
.cinema-scene__word--accent { -webkit-text-stroke: 0; background: linear-gradient(90deg, #8b5cf6, #e879f9 60%, #22d3ee); -webkit-background-clip: text; background-clip: text; }
.cinema-scene__cue { position: absolute; bottom: 22px; inset-inline: 0; display: flex; justify-content: center; align-items: center; gap: 9px; font-size: 11px; letter-spacing: .04em; color: #7c3aed; transform: translateY(calc(var(--scene-exit) * 30px + var(--scene-arrival))); }
.cinema-scene__cue svg { width: 15px; height: 15px; }
:global(.dark .cinema-scene__row) { -webkit-text-stroke-color: rgb(167 139 250 / .38); }
:global(.dark .cinema-scene__cue) { color: #c4b5fd; }
@media (max-width: 767px) {
  /* The portrait film fills the middle, so the words run in the band beneath it. */
  .cinema-scene__words { top: auto; bottom: 46px; gap: 2px; transform: translateY(var(--scene-arrival)); }
  .cinema-scene__row { font-size: 13vw; -webkit-text-stroke-width: 1px; }
  .cinema-scene__cue { bottom: 20px; }
}
@media (min-width: 768px) and (max-height: 720px) {
  /* Short windows push the heading onto the film: keep the words below it. */
  .cinema-scene__words { gap: 4px; transform: translateY(calc(-4% + var(--scene-arrival))); }
  .cinema-scene__row { font-size: clamp(56px, 7vw, 84px); }
  .cinema-scene__cue { bottom: 8px; }
}
.presentation-cinema__after { display: flex; justify-content: center; padding: 16px 12px 40px; }
.presentation-cinema__heading { text-align: center; }
.presentation-cinema__contact { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font-size: 14px; font-weight: 600; color: #6d28d9; text-underline-offset: 5px; }
.presentation-cinema__contact svg { width: 18px; height: 18px; }
.presentation-cinema__contact:hover { text-decoration: underline; }
.presentation-cinema__contact:focus-visible { outline: 2px solid #a78bfa; outline-offset: 4px; border-radius: 5px; }
:global(.dark .presentation-cinema__contact) { color: #c4b5fd; }
</style>
