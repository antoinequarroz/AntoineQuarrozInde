export interface ProjectPreview {
  readonly src: string
  readonly srcset?: string
  readonly sizes?: string
}

const carouselPreviewSizes = '(min-width: 768px) and (prefers-reduced-motion: reduce) 84vw, (min-width: 1280px) 280px, (min-width: 768px) 260px, (max-width: 390px) 91vw, (max-width: 430px) 88vw, 84vw'
const gridPreviewSizes = '(min-width: 1280px) 400px, (min-width: 768px) 46vw, 92vw'

function responsivePreview(name: string): ProjectPreview {
  return {
    src: `/portfolio-previews/${name}-800.webp`,
    srcset: `/portfolio-previews/${name}-480.webp 480w, /portfolio-previews/${name}-800.webp 800w`,
    sizes: carouselPreviewSizes,
  }
}

// Match the observed source URL exactly so a changed project image retains its own artwork.
const projectPreviews: ReadonlyMap<string, ProjectPreview> = new Map([
  [
    'https://raw.githubusercontent.com/antoinequarroz/lifxp/main/assets/brand/lifxp-ui-direction.png',
    responsivePreview('lifxp-0b05f10e'),
  ],
  [
    'https://remembeyes.expo.app/assets/assets/images/demo-contact-sheet.e5c717eb137491492e784a22cb8ee1cf.png',
    responsivePreview('remembeyes-c2d9d91f'),
  ],
])

export function resolveProjectPreview(source: string, layout: 'carousel' | 'grid' = 'carousel'): ProjectPreview {
  const preview = projectPreviews.get(source)
  if (!preview) return { src: source }
  return layout === 'grid' ? { ...preview, sizes: gridPreviewSizes } : preview
}
