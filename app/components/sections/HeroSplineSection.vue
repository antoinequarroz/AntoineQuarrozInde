<script setup lang="ts">
const { t } = useI18n();
const { track } = useMarketing();

const sceneUrl = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";
</script>

<template>
    <section class="relative w-full h-screen overflow-hidden bg-black">
        <UiSplineRobot
            :scene-url="sceneUrl"
            class-name="absolute inset-0 z-0 w-full h-full"
        />

        <div class="absolute inset-0 z-[1] pointer-events-none">
            <div
                class="absolute -top-24 left-[8%] w-72 h-72 rounded-full bg-violet-500/35 blur-3xl hero-orb-a"
            />
            <div
                class="absolute -bottom-24 right-[10%] w-80 h-80 rounded-full bg-cyan-400/28 blur-3xl hero-orb-b"
            />
        </div>

        <div
            class="absolute inset-0 z-10 bg-gradient-to-b from-black/8 via-transparent to-black/40"
        />
        <div
            class="absolute inset-0 z-10 bg-gradient-to-r from-black/35 via-transparent to-black/15"
        />

        <div
            class="absolute inset-0 z-20 section-container pointer-events-none"
        >
            <div class="h-full grid grid-rows-[1fr_auto] py-20 md:py-24">
                <div class="flex items-center">
                    <div class="max-w-3xl text-white">
                        <h1
                            class="font-display font-bold text-4xl sm:text-6xl lg:text-7xl xl:text-[5.2rem] leading-[0.9] tracking-tight"
                        >
                            <span class="block">{{ t("hero.title_1") }}</span>
                            <span class="block modern-gradient">{{
                                t("hero.title_2")
                            }}</span>
                            <span class="block">{{ t("hero.title_3") }}</span>
                        </h1>
                        <p
                            class="mt-6 text-sm sm:text-base md:text-lg text-white/72 max-w-xl leading-relaxed"
                        >
                            {{ t("hero.subtitle") }}
                        </p>
                    </div>
                </div>

                <div class="pb-3" />
            </div>
        </div>

        <div
            class="absolute bottom-32 md:bottom-40 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
        >
            <div class="flex flex-col sm:flex-row gap-3">
                <a
                    href="/#contact"
                    class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/95 text-black font-semibold hover:bg-white transition-all"
                    @click="track('hero_cta_primary_click')"
                >
                    {{ t("hero.cta_primary") }}
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.4"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M5 12h14m0 0l-4-4m4 4l-4 4"
                        />
                    </svg>
                </a>
                <a
                    href="/#portfolio"
                    class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/30 bg-white/5 text-white/90 font-semibold hover:bg-white/12 hover:text-white transition-all"
                    @click="track('hero_cta_secondary_click')"
                >
                    {{ t("hero.cta_secondary") }}
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2.2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </a>
            </div>
        </div>

        <div
            class="absolute bottom-8 right-5 md:right-8 z-20 flex flex-col items-end text-white/60 pointer-events-none"
        >
            <span class="text-[10px] tracking-[0.2em] uppercase">{{
                t("hero.scroll")
            }}</span>
            <div class="w-8 h-px mt-2 bg-white/35" />
        </div>
    </section>
</template>

<style scoped>
.modern-gradient {
    background: linear-gradient(90deg, #d8b4fe 0%, #ffffff 45%, #a5f3fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.hero-orb-a {
    animation: driftA 12s ease-in-out infinite;
}

.hero-orb-b {
    animation: driftB 14s ease-in-out infinite;
}

@keyframes driftA {
    0%,
    100% {
        transform: translateY(0) translateX(0);
    }
    50% {
        transform: translateY(24px) translateX(12px);
    }
}

@keyframes driftB {
    0%,
    100% {
        transform: translateY(0) translateX(0);
    }
    50% {
        transform: translateY(-20px) translateX(-10px);
    }
}
</style>
