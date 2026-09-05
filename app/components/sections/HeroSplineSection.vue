<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const { track } = useMarketing();

const sceneUrl = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

onMounted(() => track('hero_view'))
</script>

<template>
    <section id="hero" class="relative w-full min-h-[100svh] overflow-hidden bg-black">
        <!-- Spline background -->
        <div
            data-hero-spline-frame
            class="absolute inset-x-0 bottom-0 z-0 h-[42svh] min-h-[19rem] overflow-hidden sm:inset-0 sm:h-full sm:min-h-0"
        >
            <UiSplineRobot
                :scene-url="sceneUrl"
                class-name="hero-spline-stage absolute inset-0 h-full w-full"
            />
        </div>

        <!-- Orbes animées -->
        <div class="absolute inset-0 z-[1] pointer-events-none">
            <div
                class="absolute -top-24 left-[8%] w-72 h-72 rounded-full bg-violet-500/35 blur-3xl hero-orb-a"
            />
            <div
                class="absolute -bottom-24 right-[10%] w-80 h-80 rounded-full bg-cyan-400/28 blur-3xl hero-orb-b"
            />
        </div>

        <!-- Gradients d'ambiance -->
        <div
            class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/8 via-transparent to-black/50"
        />
        <div
            class="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-black/55 via-transparent to-black/10"
        />

        <!-- Contenu principal -->
        <div
            class="absolute inset-0 z-20 section-container pointer-events-none"
            data-hero-critical-content
        >
            <div class="h-full grid grid-rows-[1fr_auto] py-10 md:py-24">
                <div class="flex items-start pt-24 sm:items-center sm:pt-0">
                    <div class="hero-copy max-w-3xl text-white">
                        <!-- Badge -->
                        <div
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 bg-white/8 backdrop-blur-sm mb-7"
                        >
                            <span
                                class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"
                            />
                            <span
                                class="text-xs font-medium text-white/80 tracking-wide"
                                >{{ t("hero.badge") }}</span
                            >
                        </div>

                        <h1
                            class="font-display font-bold text-3xl max-[390px]:text-3xl sm:text-6xl lg:text-7xl xl:text-[5.2rem] leading-[0.96] tracking-tight"
                        >
                            <span class="block">{{ t("hero.title_1") }}</span>
                            <span class="block modern-gradient">{{
                                t("hero.title_2")
                            }}</span>
                            <span class="block">{{ t("hero.title_3") }}</span>
                        </h1>

                        <p
                            class="mt-4 text-sm sm:text-base md:text-lg text-white/80 max-w-[40ch] leading-relaxed"
                        >
                            {{ t("hero.subtitle") }}
                        </p>

                        <div class="pointer-events-auto mt-6 flex flex-col gap-3 min-[430px]:flex-row sm:max-w-none">
                            <a
                                :href="`${localePath('/')}#contact`"
                                data-hero-primary-cta
                                @click="track('hero_cta_primary_click')"
                                class="inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(124,58,237,0.32)] transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                                {{ t("hero.cta_primary") }}
                            </a>
                            <a
                                :href="`${localePath('/')}#portfolio`"
                                data-hero-secondary-cta
                                @click="track('hero_cta_secondary_click')"
                                class="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-black/20 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-cyan-300/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                                {{ t("hero.cta_secondary") }}
                            </a>
                        </div>
                    </div>
                </div>
                <div class="pb-3" />
            </div>
        </div>

        <!-- Cache le watermark Spline (plan gratuit) -->
        <div
            class="absolute bottom-0 right-0 w-72 h-20 z-30 bg-black pointer-events-none"
        />
        <div
            class="absolute bottom-0 right-0 w-96 h-24 z-30 bg-gradient-to-tl from-black via-black/95 to-transparent pointer-events-none"
        />

        <!-- Scroll hint -->
        <div
            class="absolute bottom-8 right-5 md:right-8 z-20 flex max-[430px]:hidden flex-col items-end text-white/50 pointer-events-none"
        >
            <span class="text-xs tracking-[0.2em] uppercase">{{
                t("hero.scroll")
            }}</span>
            <div class="w-8 h-px mt-2 bg-white/30" />
        </div>
    </section>
</template>

<style scoped>
.modern-gradient {
    background: linear-gradient(
        90deg,
        rgb(var(--color-brand-light)) 0%,
        rgb(var(--color-surface)) 45%,
        rgb(var(--color-cyan-light)) 100%
    );
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

@media (max-width: 639px) {
    .hero-copy {
        max-width: 100%;
        padding-bottom: min(42svh, 22rem);
    }

    :deep(.hero-spline-stage) {
        transform: translate3d(0, 8%, 0) scale(0.9);
        transform-origin: center bottom;
        mask-image: linear-gradient(to bottom, transparent 0%, black 24%, black 100%);
        pointer-events: none;
    }
}
</style>
