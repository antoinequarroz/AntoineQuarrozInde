<script setup lang="ts">
type Image = { url: string, alt: string }
const props = defineProps<{ images: Image[], editable: boolean, platform: string, busy?: boolean }>()
const emit = defineEmits<{ save: [images: Image[]], dirty: [value: boolean] }>()
const auth = useAuthStore()
const toast = useToast()
const draft = ref<Image[]>([])
const changed = ref(false)
const uploading = ref(false)
watch(() => props.images, images => { draft.value = (images || []).map(image => ({ ...image })); changed.value = false; emit('dirty', false) }, { immediate: true, deep: true })
function change() { changed.value = true; emit('dirty', true) }
function move(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= draft.value.length) return
  const image = draft.value.splice(index, 1)[0]!
  draft.value.splice(target, 0, image)
  change()
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (draft.value.length + files.length > (props.platform === 'x' ? 4 : 10)) { toast.error('Trop d’images pour cette plateforme'); input.value = ''; return }
  uploading.value = true
  emit('dirty', true)
  try {
    for (const file of files) {
      if (!(props.platform === 'instagram' ? ['image/jpeg'] : ['image/jpeg', 'image/png', 'image/webp']).includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error(props.platform === 'instagram' ? 'Instagram : images JPEG de 5 Mo maximum.' : 'Images JPG, PNG ou WebP de 5 Mo maximum.')
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await $fetch<{ url: string }>('/api/admin/upload', { method: 'POST', headers: auth.authHeader(), body: { dataUrl } })
      draft.value.push({ url: result.url, alt: file.name.replace(/\.[^.]+$/, '') })
      change()
    }
  }
  catch (error: any) { toast.error(error?.data?.message || error.message || 'Téléversement impossible') }
  finally { uploading.value = false; emit('dirty', changed.value); input.value = '' }
}
</script>
<template>
  <section class="mt-4 min-w-0 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-400/20 dark:bg-violet-500/5" aria-label="Images jointes">
    <div class="flex items-center justify-between gap-3"><h3 class="text-sm font-semibold">{{ draft.length > 1 ? `Carrousel · ${draft.length} images` : 'Visuel joint' }}</h3><span v-if="draft.length" class="text-xs text-violet-600 dark:text-violet-300">À relire avant envoi</span></div>
    <div v-if="draft.length" class="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3" tabindex="0" aria-label="Feuilleter les visuels">
      <figure v-for="(image, index) in draft" :key="image.url" class="w-[min(68vw,20rem)] shrink-0 snap-center rounded-lg bg-white p-2 dark:bg-black/20">
        <a :href="image.url" target="_blank" rel="noopener noreferrer" :aria-label="`Ouvrir le visuel ${index + 1} en grand`"><img :src="image.url" :alt="image.alt" loading="lazy" class="aspect-[4/5] w-full rounded-md object-contain"></a>
        <figcaption class="my-2 text-xs">{{ index + 1 }} / {{ draft.length }} · <a :href="image.url" target="_blank" rel="noopener noreferrer" class="underline">Ouvrir l’original ↗</a></figcaption>
        <template v-if="editable">
          <label class="block text-xs">Description du visuel {{ index + 1 }}<input v-model="image.alt" maxlength="500" class="input-field mt-1 w-full" :disabled="busy || uploading" @input="change"></label>
          <div class="mt-2 flex flex-wrap gap-2"><button type="button" class="min-h-11 px-2 text-xs underline disabled:opacity-30" :disabled="index === 0 || busy || uploading" :aria-label="`Avancer le visuel ${index + 1}`" @click="move(index, -1)">←</button><button type="button" class="min-h-11 px-2 text-xs underline disabled:opacity-30" :disabled="index === draft.length - 1 || busy || uploading" :aria-label="`Reculer le visuel ${index + 1}`" @click="move(index, 1)">→</button><button type="button" class="min-h-11 px-2 text-xs text-red-600 underline" :disabled="busy || uploading" @click="draft.splice(index, 1); change()">Retirer</button></div>
        </template>
      </figure>
    </div>
    <template v-if="editable">
      <label class="mt-3 block text-xs font-medium">Ajouter des images ({{ platform === 'instagram' ? 'JPEG' : 'JPG, PNG, WebP' }}, 5 Mo maximum)<input type="file" multiple :accept="platform === 'instagram' ? 'image/jpeg' : 'image/jpeg,image/png,image/webp'" class="mt-2 block w-full text-xs" :disabled="busy || uploading" @change="upload"></label>
      <p v-if="uploading" role="status" class="mt-2 text-xs">Téléversement en cours…</p>
      <button v-if="changed" type="button" class="mt-3 min-h-11 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50" :disabled="busy || uploading || draft.some(image => !image.alt.trim())" @click="emit('save', draft)">Enregistrer les visuels</button>
    </template>
    <p v-if="draft.length" class="mt-3 text-xs text-gray-500">Relis le texte et chaque image avant d’autoriser leur publication sur le réseau.</p>
  </section>
</template>
