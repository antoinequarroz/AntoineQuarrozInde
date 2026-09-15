export const TECHNOLOGY_LEVELS = ['daily', 'mastered', 'used'] as const
export type TechnologyLevel = typeof TECHNOLOGY_LEVELS[number]

export const TECHNOLOGY_ICON_NAMES = [
  'caddy',
  'cloudflare',
  'dart',
  'docker',
  'figma',
  'flutter',
  'git',
  'github',
  'nextjs',
  'nodejs',
  'nuxt',
  'postgresql',
  'react',
  'rust',
  'supabase',
  'stripe',
  'swiftui',
  'threejs',
  'typescript',
  'vue',
] as const

export type TechnologyIconName = typeof TECHNOLOGY_ICON_NAMES[number]

export interface TechnologyStackItem {
  key: string
  label: string
  icon: TechnologyIconName
  level: TechnologyLevel
  showAbout: boolean
  showFooter: boolean
  position: number
}

export const MAX_TECHNOLOGY_STACK_ITEMS = 40
export const MAX_TECHNOLOGY_LABEL_LENGTH = 40

const iconNames = new Set<string>(TECHNOLOGY_ICON_NAMES)
const levels = new Set<string>(TECHNOLOGY_LEVELS)

const initialEntries = [
  ['vue-3', 'Vue 3', 'vue', true],
  ['nuxt', 'Nuxt', 'nuxt', true],
  ['react', 'React', 'react', true],
  ['next-js', 'Next.js', 'nextjs', true],
  ['typescript', 'TypeScript', 'typescript', false],
  ['swiftui', 'SwiftUI', 'swiftui', true],
  ['flutter', 'Flutter', 'flutter', true],
  ['dart', 'Dart', 'dart', true],
  ['rust', 'Rust', 'rust', true],
  ['supabase', 'Supabase', 'supabase', true],
  ['postgresql', 'PostgreSQL', 'postgresql', false],
  ['node-js', 'Node.js', 'nodejs', false],
  ['three-js', 'Three.js', 'threejs', false],
  ['figma', 'Figma', 'figma', false],
  ['git', 'Git', 'git', false],
  ['github', 'GitHub', 'github', false],
  ['docker', 'Docker', 'docker', false],
  ['stripe', 'Stripe', 'stripe', false],
  ['cloudflare', 'Cloudflare', 'cloudflare', false],
  ['caddy', 'Caddy', 'caddy', false],
] as const satisfies ReadonlyArray<readonly [string, string, TechnologyIconName, boolean]>

export const DEFAULT_TECHNOLOGY_STACK: readonly TechnologyStackItem[] = initialEntries.map(
  ([key, label, icon, showFooter], position) => ({
    key,
    label,
    icon,
    level: 'used',
    showAbout: true,
    showFooter,
    position,
  }),
)

export class TechnologyStackValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TechnologyStackValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseTechnologyStackItems(value: unknown): TechnologyStackItem[] {
  if (!Array.isArray(value)) {
    throw new TechnologyStackValidationError('La liste des technologies est invalide.')
  }
  if (value.length > MAX_TECHNOLOGY_STACK_ITEMS) {
    throw new TechnologyStackValidationError(`La stack est limitée à ${MAX_TECHNOLOGY_STACK_ITEMS} technologies.`)
  }

  const keys = new Set<string>()
  const labels = new Set<string>()
  const positions = new Set<number>()

  const items = value.map((entry, index): TechnologyStackItem => {
    if (!isRecord(entry)) {
      throw new TechnologyStackValidationError(`La technologie ${index + 1} est invalide.`)
    }

    const key = typeof entry.key === 'string' ? entry.key.trim() : ''
    const label = typeof entry.label === 'string' ? entry.label.trim() : ''
    const icon = typeof entry.icon === 'string' ? entry.icon : ''
    const level = typeof entry.level === 'string' ? entry.level : ''
    const position = entry.position

    if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(key)) {
      throw new TechnologyStackValidationError(`La clé de la technologie ${index + 1} est invalide.`)
    }
    if (!label || label.length > MAX_TECHNOLOGY_LABEL_LENGTH || /[<>]/.test(label)) {
      throw new TechnologyStackValidationError(`Le nom de la technologie ${index + 1} est invalide.`)
    }
    if (!iconNames.has(icon)) {
      throw new TechnologyStackValidationError(`Le pictogramme de ${label} n'est pas autorisé.`)
    }
    if (!levels.has(level)) {
      throw new TechnologyStackValidationError(`Le niveau de ${label} est invalide.`)
    }
    if (typeof entry.showAbout !== 'boolean' || typeof entry.showFooter !== 'boolean') {
      throw new TechnologyStackValidationError(`La visibilité de ${label} est invalide.`)
    }
    if (!Number.isInteger(position) || Number(position) < 0 || Number(position) >= value.length) {
      throw new TechnologyStackValidationError(`La position de ${label} est invalide.`)
    }
    if (keys.has(key) || labels.has(label.toLocaleLowerCase('fr'))) {
      throw new TechnologyStackValidationError(`La technologie ${label} est présente plusieurs fois.`)
    }
    if (positions.has(Number(position))) {
      throw new TechnologyStackValidationError('Deux technologies ne peuvent pas partager la même position.')
    }

    keys.add(key)
    labels.add(label.toLocaleLowerCase('fr'))
    positions.add(Number(position))

    return {
      key,
      label,
      icon: icon as TechnologyIconName,
      level: level as TechnologyLevel,
      showAbout: entry.showAbout,
      showFooter: entry.showFooter,
      position: Number(position),
    }
  })

  return items.sort((left, right) => left.position - right.position)
}

export function cloneDefaultTechnologyStack(): TechnologyStackItem[] {
  return DEFAULT_TECHNOLOGY_STACK.map(item => ({ ...item }))
}

export function technologyStackOrDefault(value: unknown): TechnologyStackItem[] {
  try {
    return parseTechnologyStackItems(value)
  }
  catch {
    return cloneDefaultTechnologyStack()
  }
}
