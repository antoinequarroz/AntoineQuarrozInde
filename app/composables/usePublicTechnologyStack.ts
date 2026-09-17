import { cloneDefaultTechnologyStack, type TechnologyStackItem } from '~~/shared/utils/technologyStack'

type PublicTechnologyStackResponse = {
  items: TechnologyStackItem[]
}

const fetchPublicTechnologyStack = () => $fetch<PublicTechnologyStackResponse>('/api/public/technology-stack')

export function usePublicTechnologyStack() {
  return useAsyncData('public-technology-stack', fetchPublicTechnologyStack, {
    default: () => ({ items: cloneDefaultTechnologyStack() }),
  })
}
