<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const presentation = shallowRef<{ pauseVideo: () => void } | null>(null)

const copy = computed(() => {
  if (locale.value === 'en') return { badge: 'In video', title: 'An idea.', accent: 'Made real.', subtitle: 'Discover my work in 50 seconds.', design: 'Design', code: 'Code', experience: 'Experience', scroll: 'Scroll to discover' }
  if (locale.value === 'de') return { badge: 'Im Video', title: 'Eine Idee.', accent: 'Dann wird sie Realität.', subtitle: 'Meine Arbeit in 50 Sekunden entdecken.', design: 'Design', code: 'Code', experience: 'Erlebnis', scroll: 'Scrollen und entdecken' }
  return { badge: 'En vidéo', title: 'Une idée.', accent: 'Puis du concret.', subtitle: 'Mon travail en 50 secondes.', design: 'Design', code: 'Code', experience: 'Expérience', scroll: 'Défiler pour découvrir' }
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
          <div class="cinema-scene__halo" />
          <div class="cinema-scene__cards">
            <div class="cinema-scene__card cinema-scene__card--design">
              <span class="cinema-scene__number">01</span>
              <span class="cinema-scene__label">{{ copy.design }}</span>
              <div class="cinema-scene__swatches"><i /><i /><i /></div>
            </div>
            <div class="cinema-scene__card cinema-scene__card--code">
              <span class="cinema-scene__number">02</span>
              <span class="cinema-scene__label">{{ copy.code }}</span>
              <div class="cinema-scene__code"><span>&lt;/&gt;</span><i /><i /></div>
            </div>
            <div class="cinema-scene__card cinema-scene__card--experience">
              <span class="cinema-scene__number">03</span>
              <span class="cinema-scene__label">{{ copy.experience }}</span>
              <div class="cinema-scene__path"><i /><span /><i /><span /><i /></div>
            </div>
          </div>
          <div class="cinema-scene__cue">
            <span>{{ copy.scroll }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m-5-5 5 5 5-5" /></svg>
          </div>
        </div>
      </template>
      <template #default="{ controlsTarget }">
        <SectionsAboutVideo ref="presentation" :controls-target="controlsTarget" />
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
.cinema-scene__halo { position: absolute; left: 50%; top: 50%; width: min(820px, 85vw); aspect-ratio: 1.8; border: 1px solid rgb(139 92 246 / .14); border-radius: 50%; background: radial-gradient(ellipse, rgb(139 92 246 / .12), transparent 68%); transform: translate(-50%, -50%) scale(calc(1 + var(--scene-exit) * .4)); }
.cinema-scene__card { position: absolute; width: 176px; padding: 16px; border-radius: 18px; border: 1px solid rgb(139 92 246 / .22); color: #4c1d95; background: #faf7ff; box-shadow: 0 16px 44px -22px rgb(109 40 217 / .25); transform: translate3d(calc(var(--exit-x) * var(--scene-exit)), calc(var(--exit-y) * var(--scene-exit) + var(--scene-arrival)), 0) rotate(calc(var(--rotation) + var(--exit-rotation) * var(--scene-exit))); }
.cinema-scene__card--design { left: calc(50% - clamp(220px, 31vw, 460px)); top: 42%; --exit-x: -180px; --exit-y: -45px; --rotation: -8deg; --exit-rotation: -10deg; }
.cinema-scene__card--code { right: calc(50% - clamp(220px, 31vw, 460px)); top: 43%; --exit-x: 180px; --exit-y: -30px; --rotation: 7deg; --exit-rotation: 12deg; }
.cinema-scene__card--experience { left: calc(50% - 88px); top: 72%; --exit-x: 0px; --exit-y: 110px; --rotation: -3deg; --exit-rotation: 7deg; }
.cinema-scene__number { margin-right: 10px; font-size: 10px; font-weight: 600; color: #7c3aed; }
.cinema-scene__label { font-size: 14px; font-weight: 600; }
.cinema-scene__swatches { display: flex; margin-top: 20px; gap: 6px; }
.cinema-scene__swatches i { height: 24px; flex: 1; border-radius: 6px; background: #8b5cf6; }
.cinema-scene__swatches i:nth-child(2) { background: #e879f9; }
.cinema-scene__swatches i:nth-child(3) { background: #22d3ee; }
.cinema-scene__code { margin-top: 14px; display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 7px; }
.cinema-scene__code span { grid-row: span 2; font-size: 23px; font-weight: 500; color: #a78bfa; }
.cinema-scene__code i { height: 4px; border-radius: 4px; background: #c4b5fd; }
.cinema-scene__code i:last-child { width: 65%; background: #e879f9; }
.cinema-scene__path { margin-top: 20px; display: flex; align-items: center; }
.cinema-scene__path i { width: 9px; height: 9px; border: 1px solid #a78bfa; border-radius: 50%; }
.cinema-scene__path i:last-child { background: #a78bfa; }
.cinema-scene__path span { height: 1px; flex: 1; background: linear-gradient(90deg, #a78bfa, #e879f9); }
.cinema-scene__cue { position: absolute; bottom: 22px; inset-inline: 0; display: flex; justify-content: center; align-items: center; gap: 9px; font-size: 11px; letter-spacing: .04em; color: #7c3aed; transform: translateY(calc(var(--scene-exit) * 30px + var(--scene-arrival))); }
.cinema-scene__cue svg { width: 15px; height: 15px; }
:global(.dark .cinema-scene__card) { color: #ede9fe; background: #181323; border-color: rgb(167 139 250 / .2); }
:global(.dark .cinema-scene__number) { color: #c4b5fd; }
:global(.dark .cinema-scene__cue) { color: #c4b5fd; }
@media (max-width: 767px) {
  .cinema-scene__halo { width: 92%; aspect-ratio: 1; }
  .cinema-scene__cards { position: absolute; inset-inline: 0; bottom: 54px; display: flex; justify-content: center; gap: 8px; }
  .cinema-scene__card { position: relative; inset: auto; width: auto; padding: 8px 10px; border-radius: 9px; --exit-x: 0px; --exit-y: 40px; --rotation: 0deg; --exit-rotation: 0deg; }
  .cinema-scene__number, .cinema-scene__swatches, .cinema-scene__code, .cinema-scene__path { display: none; }
  .cinema-scene__label { font-size: 11px; }
  .cinema-scene__cue { bottom: 20px; }
}
@media (min-width: 768px) and (max-height: 720px) {
  .cinema-scene__card { width: 144px; padding: 12px; }
  .cinema-scene__card--experience { left: calc(50% - 72px); top: 73%; }
  .cinema-scene__swatches, .cinema-scene__path { margin-top: 12px; }
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
