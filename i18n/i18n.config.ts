import fr from './locales/fr.json'
import en from './locales/en.json'
import de from './locales/de.json'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'fr',
  messages: {
    fr,
    en,
    de,
  },
}))
