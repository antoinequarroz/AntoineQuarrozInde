<script setup lang="ts">
const props = defineProps<{ modelValue: string | null }>();
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();

const inputRef = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
const auth = useAuthStore();

async function processFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise<void>((resolve) => {
        img.onload = () => {
            const MAX = 900;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
                const ratio = Math.min(MAX / width, MAX / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve();
        };
        img.src = url;
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    const { url: publicUrl } = await $fetch<{ url: string }>(
        "/api/admin/upload",
        {
            method: "POST",
            body: { dataUrl },
            headers: auth.authHeader(),
        },
    );

    emit("update:modelValue", publicUrl);
}

function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) processFile(file);
}

function onDrop(e: DragEvent) {
    dragging.value = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
}

function clear() {
    emit("update:modelValue", null);
    if (inputRef.value) inputRef.value.value = "";
}
</script>

<template>
    <div>
        <!-- Preview -->
        <div
            v-if="modelValue"
            class="relative rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.06] mb-2"
        >
            <img
                :src="modelValue"
                class="w-full h-40 object-cover"
                alt="Preview"
            />
            <button
                type="button"
                class="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                @click="clear"
            >
                <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
        </div>

        <!-- Drop zone -->
        <div
            v-else
            class="relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-200"
            :class="
                dragging
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10'
                    : 'border-gray-200 dark:border-white/[0.08] hover:border-violet-300 dark:hover:border-violet-500/40'
            "
            @click="inputRef?.click()"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="onDrop"
        >
            <svg
                class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
            </svg>
            <p class="text-xs text-gray-400">Cliquer ou glisser une image</p>
            <p class="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">
                JPG, PNG, WebP — redimensionné auto
            </p>
        </div>

        <input
            ref="inputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onFileChange"
        />
    </div>
</template>
