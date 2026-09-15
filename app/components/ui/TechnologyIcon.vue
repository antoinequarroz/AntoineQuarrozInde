<script setup lang="ts">
import {
  siCloudflare,
  siDart,
  siDocker,
  siFigma,
  siFlutter,
  siGit,
  siGithub,
  siNextdotjs,
  siNodedotjs,
  siNuxt,
  siPostgresql,
  siReact,
  siRust,
  siSupabase,
  siStripe,
  siSwift,
  siThreedotjs,
  siTypescript,
  siVuedotjs,
} from 'simple-icons'

type TechnologyIconName =
  | 'cloudflare'
  | 'dart'
  | 'docker'
  | 'figma'
  | 'flutter'
  | 'git'
  | 'github'
  | 'nextjs'
  | 'nodejs'
  | 'nuxt'
  | 'postgresql'
  | 'react'
  | 'rust'
  | 'supabase'
  | 'stripe'
  | 'swiftui'
  | 'threejs'
  | 'typescript'
  | 'vue'

const props = defineProps<{
  name: TechnologyIconName
}>()

const paths: Record<TechnologyIconName, string> = {
  cloudflare: siCloudflare.path,
  dart: siDart.path,
  docker: siDocker.path,
  figma: siFigma.path,
  flutter: siFlutter.path,
  git: siGit.path,
  github: siGithub.path,
  nextjs: siNextdotjs.path,
  nodejs: siNodedotjs.path,
  nuxt: siNuxt.path,
  postgresql: siPostgresql.path,
  react: siReact.path,
  rust: siRust.path,
  supabase: siSupabase.path,
  stripe: siStripe.path,
  swiftui: siSwift.path,
  threejs: siThreedotjs.path,
  typescript: siTypescript.path,
  vue: siVuedotjs.path,
}
</script>

<template>
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path :d="paths[props.name]" />
  </svg>
</template>
