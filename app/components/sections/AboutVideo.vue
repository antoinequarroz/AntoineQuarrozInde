<script setup lang="ts">
defineProps<{ controlsTarget?: HTMLElement | null }>()
const { locale } = useI18n()
const video = shallowRef<HTMLVideoElement | null>(null)
const frame = shallowRef<HTMLElement | null>(null)
const screen = shallowRef<HTMLElement | null>(null)
const started = ref(false)
const playing = ref(false)
const muted = ref(true)
const captions = ref(false)
const currentTime = ref(0)
const duration = ref(49.9)
const portrait = ref(false)
const playbackError = ref(false)
const expanded = ref(false)
const canFullscreen = ref(false)
let observer: IntersectionObserver | undefined
let formatQuery: MediaQueryList | undefined
let motionQuery: MediaQueryList | undefined
let inView = false
let userPaused = false
let autoplayBlocked = false
const ended = ref(false)

const copy = computed(() => {
  if (locale.value === 'en') return {
    title: 'My work in 50 seconds', play: 'Play video', pause: 'Pause video', replay: 'Replay video',
    soundOn: 'Enable sound', soundOff: 'Mute sound', sound: 'Sound', captions: 'French captions',
    seek: 'Video progress', enlarge: 'Full screen', shrink: 'Exit full screen',
    silent: 'Playing without sound', language: 'Video in French', error: 'The video could not load. Please try again.',
  }
  if (locale.value === 'de') return {
    title: 'Meine Arbeit in 50 Sekunden', play: 'Video abspielen', pause: 'Video pausieren', replay: 'Video erneut abspielen',
    soundOn: 'Ton einschalten', soundOff: 'Ton ausschalten', sound: 'Ton', captions: 'Französische Untertitel',
    seek: 'Videofortschritt', enlarge: 'Vollbild', shrink: 'Vollbild verlassen',
    silent: 'Wiedergabe ohne Ton', language: 'Video auf Französisch', error: 'Das Video konnte nicht geladen werden. Bitte erneut versuchen.',
  }
  return {
    title: 'Mon travail en 50 secondes', play: 'Lire la vidéo', pause: 'Mettre la vidéo en pause', replay: 'Revoir la vidéo',
    soundOn: 'Activer le son', soundOff: 'Couper le son', sound: 'Son', captions: 'Sous-titres français',
    seek: 'Avancement de la vidéo', enlarge: 'Plein écran', shrink: 'Quitter le plein écran',
    silent: 'Lecture sans son', language: 'Présentation vidéo', error: 'La vidéo n’a pas pu charger. Vous pouvez réessayer.',
  }
})

const poster = computed(() => `/videos/presentation/affiche-${portrait.value ? 'portrait' : 'paysage'}.jpg`)
const progress = computed(() => Math.min(100, currentTime.value / duration.value * 100))
const playLabel = computed(() => playing.value ? copy.value.pause : ended.value ? copy.value.replay : copy.value.play)

function clock(time: number) {
  const seconds = Math.max(0, Math.floor(time))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function updateFormat() {
  // Once started, keep the same source when the window is resized.
  if (!started.value) portrait.value = Boolean(formatQuery?.matches)
}

function syncCaptions() {
  const track = video.value?.textTracks[0]
  if (track) track.mode = captions.value ? 'showing' : 'disabled'
}

function pauseVideo() {
  video.value?.pause()
}

defineExpose({ pauseVideo })

async function playVideo(manual = false) {
  const player = video.value
  if (!player) return
  playbackError.value = false
  if (manual) {
    userPaused = false
    autoplayBlocked = false
  }
  if (!started.value) {
    player.muted = muted.value
    player.src = `/videos/presentation/antoine-${portrait.value ? 'portrait' : 'paysage'}.mp4`
    started.value = true
  }
  if (ended.value) {
    player.currentTime = 0
    ended.value = false
  }
  syncCaptions()
  try {
    await player.play()
  }
  catch {
    // Autoplay may be blocked (e.g. low power mode); keep a manual play button.
    // Ignore interruptions from scrolling out of view while play was pending.
    if (inView && !userPaused) autoplayBlocked = true
  }
}

function togglePlayback() {
  if (playing.value) {
    userPaused = true
    pauseVideo()
  }
  else void playVideo(true)
}

function toggleSound() {
  muted.value = !muted.value
  if (video.value) video.value.muted = muted.value
}

function toggleCaptions() {
  captions.value = !captions.value
  syncCaptions()
}

function updateTime() {
  if (video.value) currentTime.value = video.value.currentTime
}

function loadedMetadata() {
  if (video.value && Number.isFinite(video.value.duration)) duration.value = video.value.duration
  syncCaptions()
}

function seek(event: Event) {
  const player = video.value
  if (!player || !started.value) return
  const value = Number((event.target as HTMLInputElement).value)
  player.currentTime = value
  currentTime.value = value
  ended.value = value >= duration.value
}

function onEnd() {
  playing.value = false
  ended.value = true
}

function allowAutomaticPlayback() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return !motionQuery?.matches && !connection?.saveData && muted.value
    && !document.hidden && !userPaused && !autoplayBlocked && !ended.value
}

function visibilityChanged() {
  if (document.hidden) pauseVideo()
  else if (inView && allowAutomaticPlayback()) void playVideo()
}

function motionChanged() {
  if (motionQuery?.matches) {
    pauseVideo()
  }
}

function fullscreenChanged() {
  expanded.value = document.fullscreenElement === frame.value
}

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
  else await frame.value?.requestFullscreen().catch(() => {})
}

onMounted(() => {
  formatQuery = window.matchMedia('(max-width: 767px)')
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateFormat()
  formatQuery.addEventListener('change', updateFormat)
  motionQuery.addEventListener('change', motionChanged)
  document.addEventListener('visibilitychange', visibilityChanged)
  document.addEventListener('fullscreenchange', fullscreenChanged)
  canFullscreen.value = Boolean(document.fullscreenEnabled && frame.value?.requestFullscreen)
  const element = screen.value
  if (!element || !('IntersectionObserver' in window)) return
  observer = new IntersectionObserver(([entry]) => {
    if (!entry) return
    inView = entry.isIntersecting && entry.intersectionRatio >= 0.45
    if (inView && allowAutomaticPlayback()) void playVideo()
    else if (!entry.isIntersecting || entry.intersectionRatio < 0.15) pauseVideo()
  }, { threshold: [0, 0.12, 0.15, 0.45] })
  observer.observe(element)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  formatQuery?.removeEventListener('change', updateFormat)
  motionQuery?.removeEventListener('change', motionChanged)
  document.removeEventListener('visibilitychange', visibilityChanged)
  document.removeEventListener('fullscreenchange', fullscreenChanged)
  pauseVideo()
})
</script>

<template>
  <figure ref="frame" class="about-film" :aria-label="copy.title">
    <div ref="screen" class="about-film__screen">
      <video
        ref="video"
        class="about-film__player"
        :poster="poster"
        :aria-label="copy.title"
        :muted="muted"
        preload="none"
        playsinline
        @play="playing = true"
        @pause="playing = false"
        @ended="onEnd"
        @timeupdate="updateTime"
        @loadedmetadata="loadedMetadata"
        @error="playbackError = true"
      >
        <track kind="subtitles" src="/videos/presentation/sous-titres-fr.vtt" srclang="fr" label="Français" @load="syncCaptions">
      </video>
      <picture v-if="!started || ended" class="about-film__poster">
        <source media="(max-width: 767px)" srcset="/videos/presentation/affiche-portrait.jpg">
        <img src="/videos/presentation/affiche-paysage.jpg" alt="" width="1920" height="1080" loading="lazy" decoding="async">
      </picture>
      <button v-if="!playing" type="button" class="about-film__start" :aria-label="playLabel" @click="playVideo(true)">
        <span aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.7c0-.8.9-1.3 1.6-.9l10 6.3c.7.4.7 1.4 0 1.8l-10 6.3c-.7.4-1.6-.1-1.6-.9V5.7Z" /></svg></span>
      </button>
    </div>
    <Teleport :to="controlsTarget || 'body'" :disabled="!controlsTarget || expanded">
      <div class="about-film__controls">
        <div class="about-film__toolbar">
          <button type="button" class="about-film__icon-button" :aria-label="playLabel" :title="playLabel" @click="togglePlayback">
            <svg v-if="playing" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zm6 0h4v14h-4z" /></svg>
            <svg v-else aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.7c0-.8.9-1.3 1.6-.9l10 6.3c.7.4.7 1.4 0 1.8l-10 6.3c-.7.4-1.6-.1-1.6-.9V5.7Z" /></svg>
          </button>
          <span class="about-film__time" aria-hidden="true">{{ clock(currentTime) }} <span>/ {{ clock(duration) }}</span></span>
          <span class="about-film__status">{{ muted ? copy.silent : copy.language }}</span>
          <button type="button" class="about-film__sound-button" :aria-label="muted ? copy.soundOn : copy.soundOff" :title="muted ? copy.soundOn : copy.soundOff" :aria-pressed="!muted" @click="toggleSound">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path stroke-linejoin="round" d="m11 4-6 5H2v6h3l6 5V4Z" />
              <path v-if="muted" stroke-linecap="round" d="m16 9 5 6m0-6-5 6" />
              <path v-else stroke-linecap="round" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
            </svg>
            <span>{{ muted ? copy.soundOn : copy.soundOff }}</span>
          </button>
          <button type="button" class="about-film__icon-button about-film__cc" :class="{ 'about-film__cc--active': captions }" :aria-label="copy.captions" :title="copy.captions" :aria-pressed="captions" @click="toggleCaptions">CC</button>
          <button v-if="canFullscreen" type="button" class="about-film__icon-button" :aria-label="expanded ? copy.shrink : copy.enlarge" :title="expanded ? copy.shrink : copy.enlarge" @click="toggleFullscreen">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5" /></svg>
          </button>
        </div>
        <input
          class="about-film__progress"
          type="range"
          min="0"
          :max="duration"
          step="0.1"
          :value="currentTime"
          :disabled="!started"
          :aria-label="copy.seek"
          :aria-valuetext="`${clock(currentTime)} / ${clock(duration)}`"
          :style="{ '--film-progress': `${progress}%` }"
          @input="seek"
        >
      </div>
    </Teleport>
    <figcaption class="sr-only">{{ copy.title }}</figcaption>
    <p v-if="playbackError" class="about-film__error" role="status">{{ copy.error }}</p>
  </figure>
</template>

<style scoped>
.about-film {
  --film-ink: #f5f3ff;
  --film-muted: #b8b0cb;
  margin: 0;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgb(139 92 246 / .26);
  background: #0d0a16;
  color: var(--film-ink);
  box-shadow: 0 28px 70px -40px rgb(109 40 217 / .5);
}
.about-film__screen { position: relative; aspect-ratio: 16 / 9; background: #08070f; }
.about-film__player { display: block; width: 100%; height: 100%; object-fit: contain; }
.about-film__poster { position: absolute; inset: 0; pointer-events: none; }
.about-film__poster img { display: block; width: 100%; height: 100%; object-fit: cover; }
.about-film__start { position: absolute; inset: 0; display: grid; place-items: center; width: 100%; cursor: pointer; }
.about-film__start span { display: grid; place-items: center; width: 68px; height: 68px; border-radius: 50%; border: 1px solid rgb(255 255 255 / .35); background: rgb(39 24 67 / .86); box-shadow: 0 8px 28px rgb(0 0 0 / .2); transition: transform 200ms ease-out, background 200ms ease-out; }
.about-film__start svg { width: 30px; height: 30px; }
.about-film__start:hover span { transform: scale(1.07); background: #7c3aed; }
.about-film__start:focus-visible { outline: 3px solid #c4b5fd; outline-offset: -5px; }
.about-film__controls { --film-ink: #f5f3ff; --film-muted: #b8b0cb; color: var(--film-ink); padding: 8px 14px 7px; background: #0d0a16; border-top: 1px solid rgb(255 255 255 / .06); }
.about-film__toolbar { display: flex; align-items: center; gap: 7px; }
.about-film__icon-button, .about-film__sound-button { min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; border-radius: 10px; color: var(--film-ink); transition: background 150ms ease-out; }
.about-film__icon-button svg, .about-film__sound-button svg { width: 20px; height: 20px; flex-shrink: 0; }
.about-film__icon-button:hover, .about-film__sound-button:hover { background: rgb(139 92 246 / .18); }
.about-film__icon-button:focus-visible, .about-film__sound-button:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 2px; }
.about-film__sound-button { padding: 0 11px; font-size: 12px; font-weight: 550; background: rgb(139 92 246 / .12); }
.about-film__time { white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 12px; }
.about-film__time span { color: var(--film-muted); }
.about-film__status { flex: 1; text-align: right; margin-right: 10px; font-size: 12px; color: var(--film-muted); }
.about-film__cc { font-size: 12px; font-weight: 700; color: var(--film-muted); }
.about-film__cc--active { color: #ddd6fe; background: rgb(139 92 246 / .25); text-decoration: underline; text-underline-offset: 5px; }
.about-film__progress { appearance: none; display: block; width: 100%; height: 24px; margin: 0; cursor: pointer; background: transparent; }
.about-film__progress::-webkit-slider-runnable-track { height: 3px; border-radius: 3px; background: linear-gradient(to right, #a78bfa var(--film-progress), #32273f var(--film-progress)); }
.about-film__progress::-moz-range-track { height: 3px; border-radius: 3px; background: #32273f; }
.about-film__progress::-moz-range-progress { height: 3px; background: #a78bfa; }
.about-film__progress::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; margin-top: -4.5px; border-radius: 50%; background: #ddd6fe; }
.about-film__progress::-moz-range-thumb { width: 12px; height: 12px; border: 0; border-radius: 50%; background: #ddd6fe; }
.about-film__progress:focus-visible { outline: 2px solid #c4b5fd; outline-offset: 2px; border-radius: 5px; }
.about-film__progress:disabled { cursor: default; opacity: .5; }
.about-film__error { padding: 10px 20px; font-size: 13px; }
.about-film:fullscreen { display: flex; flex-direction: column; border: 0; border-radius: 0; }
.about-film:fullscreen .about-film__screen { min-height: 0; flex: 1; aspect-ratio: auto; }
.about-film:fullscreen .about-film__controls { flex-shrink: 0; }
@media (max-width: 767px) { .about-film { border-radius: 20px; } .about-film__screen { aspect-ratio: 4 / 5; } .about-film__controls { padding-inline: 8px; } .about-film__toolbar { gap: 2px; } .about-film__status { display: none; } .about-film__sound-button { margin-left: auto; padding-inline: 8px; } }
@media (min-width: 768px) and (max-width: 1100px) { .about-film__status { display: none; } .about-film__sound-button { margin-left: auto; } }
@media (prefers-reduced-motion: reduce) { .about-film, .about-film__start span { transition: none; } }
</style>
