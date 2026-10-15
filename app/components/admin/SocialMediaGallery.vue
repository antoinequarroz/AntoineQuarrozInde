<script setup lang="ts">
type Media = { type: 'image' | 'video', url: string, alt: string }
const props = withDefaults(defineProps<{
  media?: Media[]
  legacyImages?: { url: string, alt: string }[]
  editable: boolean
  busy?: boolean
}>(), { media: () => [], legacyImages: () => [] })
const emit = defineEmits<{ save: [media: Media[]], dirty: [value: boolean] }>()
const auth = useAuthStore()
const toast = useToast()
const draft = ref<Media[]>([])
const changed = ref(false)
const uploading = ref(false)
const uploadError = ref('')
const announcement = ref('')
const galleryRef = ref<HTMLElement | null>(null)
const uploadInputRef = ref<HTMLInputElement | null>(null)
const imageCount = computed(() => draft.value.filter(item => item.type === 'image').length)
const videoCount = computed(() => draft.value.filter(item => item.type === 'video').length)
const summary = computed(() => [
  imageCount.value ? `${imageCount.value} image${imageCount.value > 1 ? 's' : ''}` : '',
  videoCount.value ? `${videoCount.value} vidéo${videoCount.value > 1 ? 's' : ''}` : '',
].filter(Boolean).join(' et '))
const validCount = computed(() => draft.value.length === 0 || (draft.value.length >= 2 && draft.value.length <= 10))

watch(() => [props.media, props.legacyImages], () => {
  draft.value = props.media.length
    ? props.media.map(item => ({ ...item }))
    : props.legacyImages.map(image => ({ type: 'image' as const, ...image }))
  changed.value = false
  uploadError.value = ''
  emit('dirty', false)
}, { immediate: true, deep: true })

function change() { changed.value = true; emit('dirty', true) }
function move(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= draft.value.length) return
  const item = draft.value.splice(index, 1)[0]!
  draft.value.splice(target, 0, item)
  announcement.value = `Média déplacé en position ${target + 1} sur ${draft.value.length}.`
  change()
}
async function remove(index: number) {
  draft.value.splice(index, 1)
  announcement.value = `Média retiré. ${draft.value.length} média${draft.value.length > 1 ? 's' : ''} restant${draft.value.length > 1 ? 's' : ''}.`
  change()
  await nextTick()
  const nextIndex = Math.min(index, draft.value.length - 1)
  const nextRemove = galleryRef.value?.querySelector<HTMLButtonElement>(`[data-media-position="${nextIndex}"] [data-remove-media]`)
  ;(nextRemove || uploadInputRef.value)?.focus()
}
function dataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Ce fichier ne peut pas être lu.'))
    reader.readAsDataURL(file)
  })
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return
  uploadError.value = ''
  try {
    if (draft.value.length + files.length > 10) throw new Error('Un carrousel Instagram contient au maximum 10 médias.')
    for (const file of files) {
      if (!['image/jpeg', 'video/mp4'].includes(file.type)) throw new Error('Choisis des images JPEG ou des vidéos MP4.')
      const maximum = (file.type === 'video/mp4' ? 20 : 5) * 1024 * 1024
      if (file.size > maximum) throw new Error(file.type === 'video/mp4' ? 'Les vidéos MP4 sont limitées à 20 Mo.' : 'Les images JPEG sont limitées à 5 Mo.')
    }
    uploading.value = true
    emit('dirty', true)
    for (const file of files) {
      const type = file.type === 'video/mp4' ? 'video' : 'image'
      const endpoint = type === 'video' ? '/api/admin/social-video-upload' : '/api/admin/upload'
      const result = await $fetch<{ url: string }>(endpoint, {
        method: 'POST', headers: auth.authHeader(), body: { dataUrl: await dataUrl(file) },
      })
      draft.value.push({ type, url: result.url, alt: file.name.replace(/\.[^.]+$/, '') })
      change()
    }
    announcement.value = `${files.length} média${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}. Enregistre le carrousel pour conserver ces changements.`
  }
  catch (error: any) {
    uploadError.value = error?.data?.message || error.message || 'Téléversement impossible.'
    toast.error(uploadError.value)
  }
  finally { uploading.value = false; emit('dirty', changed.value); input.value = '' }
}
</script>

<template>
  <section class="mt-4 min-w-0 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-400/20 dark:bg-violet-500/5" aria-label="Médias Instagram joints">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 class="text-sm font-semibold">{{ draft.length > 1 ? `Carrousel · ${summary}` : draft.length ? 'Visuel joint' : 'Carrousel Instagram' }}</h3>
      <span v-if="draft.length" class="text-xs text-violet-600 dark:text-violet-300">À relire avant envoi</span>
    </div>
    <div v-if="draft.length" ref="galleryRef" class="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3" tabindex="0" aria-label="Feuilleter les images et vidéos">
      <figure v-for="(item, index) in draft" :key="item.url" :data-media-position="index" class="w-[min(68vw,20rem)] shrink-0 snap-center rounded-lg bg-white p-2 dark:bg-black/20">
        <video v-if="item.type === 'video'" :src="item.url" :aria-label="`Vidéo ${index + 1} : ${item.alt}`" controls muted playsinline preload="metadata" class="aspect-[4/5] w-full rounded-md bg-black object-contain">
          Ton navigateur ne peut pas lire cette vidéo. Ouvre l’original avec le lien ci-dessous.
        </video>
        <a v-else :href="item.url" target="_blank" rel="noopener noreferrer" :aria-label="`Ouvrir l’image ${index + 1} en grand`"><img :src="item.url" :alt="item.alt" loading="lazy" class="aspect-[4/5] w-full rounded-md object-contain"></a>
        <figcaption class="my-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>{{ index + 1 }} / {{ draft.length }} · {{ item.type === 'video' ? 'Vidéo' : 'Image' }}</span>
          <a :href="item.url" target="_blank" rel="noopener noreferrer" :aria-label="`Ouvrir l’original du média ${index + 1}`" class="underline">Ouvrir ↗</a>
          <a :href="item.url" download :aria-label="`Télécharger le média ${index + 1}`" class="underline">Télécharger</a>
        </figcaption>
        <template v-if="editable">
          <label class="block text-xs">Description du média {{ index + 1 }}<input v-model="item.alt" required maxlength="500" :aria-invalid="!item.alt.trim()" class="input-field mt-1 w-full" :disabled="busy || uploading" @input="change"></label>
          <div class="mt-2 flex flex-wrap gap-2">
            <button type="button" class="min-h-11 min-w-11 px-2 text-xs underline disabled:opacity-30" :disabled="index === 0 || busy || uploading" :aria-label="`Avancer le média ${index + 1}`" @click="move(index, -1)">←</button>
            <button type="button" class="min-h-11 min-w-11 px-2 text-xs underline disabled:opacity-30" :disabled="index === draft.length - 1 || busy || uploading" :aria-label="`Reculer le média ${index + 1}`" @click="move(index, 1)">→</button>
            <button data-remove-media type="button" class="min-h-11 px-2 text-xs text-red-600 underline dark:text-red-300" :disabled="busy || uploading" :aria-label="`Retirer le média ${index + 1}`" @click="remove(index)">Retirer</button>
          </div>
        </template>
        <p v-else-if="item.type === 'video'" class="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-300">{{ item.alt }}</p>
      </figure>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
    <template v-if="editable">
      <label class="mt-3 block text-xs font-medium">Ajouter des images ou vidéos<input ref="uploadInputRef" type="file" multiple accept="image/jpeg,video/mp4" class="mt-2 block w-full text-xs" :disabled="busy || uploading" @change="upload"></label>
      <p class="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">2 à 10 médias, dans l’ordre de publication. JPEG : 5 Mo maximum. MP4 H.264 : 20 Mo, de 3 à 60 secondes.</p>
      <p v-if="uploading" role="status" class="mt-2 text-xs">Téléversement et vérification en cours…</p>
      <p v-if="uploadError" role="alert" class="mt-2 text-xs text-red-700 dark:text-red-300">{{ uploadError }}</p>
      <p v-if="changed && !validCount" role="status" class="mt-2 text-xs text-amber-700 dark:text-amber-300">Ajoute au moins deux médias pour enregistrer un carrousel.</p>
      <p v-if="changed && draft.some(item => !item.alt.trim())" role="status" class="mt-2 text-xs text-amber-700 dark:text-amber-300">Chaque média doit avoir une description avant l’enregistrement.</p>
      <button v-if="changed" type="button" class="mt-3 min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="busy || uploading || !validCount || draft.some(item => !item.alt.trim())" @click="emit('save', draft)">Enregistrer les médias</button>
    </template>
    <p v-if="draft.length" class="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">Relis les images, regarde les vidéos et vérifie leur ordre. Enregistrer ne valide ni ne publie le carrousel.</p>
  </section>
</template>
