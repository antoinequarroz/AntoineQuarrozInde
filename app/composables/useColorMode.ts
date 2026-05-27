export function useAppColorMode() {
  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  const isLight = computed(() => colorMode.value === 'light')

  return { colorMode, isDark, isLight }
}
