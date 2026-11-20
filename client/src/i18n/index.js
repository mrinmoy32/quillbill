// Translations. To add a language: copy locales/en.json to locales/<code>.json, translate the
// values, and add it to `resources` below. Missing keys fall back to English.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { config } from '@/config'
import en from './locales/en.json'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: config.defaultLocale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
})

export default i18n
