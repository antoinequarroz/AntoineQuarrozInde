<script setup lang="ts">
const { t } = useI18n();

const sceneUrl = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";
</script>

<template>
    <section id="hero" class="relative w-full min-h-[100svh] overflow-hidden bg-black">
        <!-- Spline background -->
        <UiSplineRobot
            :scene-url="sceneUrl"
            class-name="absolute inset-0 z-0 w-full h-full"
        />

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
            class="absolute inset-0 z-10 bg-gradient-to-b from-black/8 via-transparent to-black/50"
        />
        <div
            class="absolute inset-0 z-10 bg-gradient-to-r from-black/55 via-transparent to-black/10"
        />

        <!-- Contenu principal -->
        <div
            class="absolute inset-0 z-20 section-container pointer-events-none"
        >
            <div class="h-full grid grid-rows-[1fr_auto] py-12 max-[430px]:py-10 md:py-24">
                <div class="flex items-center">
                    <div class="max-w-3xl pt-12 max-[430px]:pt-10 md:pt-8 text-white">
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
                            class="font-display font-bold text-[1.95rem] max-[390px]:text-[1.78rem] sm:text-6xl lg:text-7xl xl:text-[5.2rem] leading-[0.96] tracking-tight"
                        >
                            <span class="block">{{ t("hero.title_1") }}</span>
                            <span class="block modern-gradient">{{
                                t("hero.title_2")
                            }}</span>
                            <span class="block">{{ t("hero.title_3") }}</span>
                        </h1>

                        <p
                            class="mt-3.5 text-[12.5px] max-[390px]:text-[12px] sm:text-base md:text-lg text-white/72 max-w-[34ch] leading-relaxed"
                        >
                            {{ t("hero.subtitle") }}
                        </p>
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
            <span class="text-[10px] tracking-[0.2em] uppercase">{{
                t("hero.scroll")
            }}</span>
            <div class="w-8 h-px mt-2 bg-white/30" />
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
