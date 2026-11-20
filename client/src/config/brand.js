// Product identity. The values live in /brand.config.json (repo root): change them THERE.
import brand from '@brand'

export { brand }

/** Call once at startup: applies colors, fonts and the page title from brand.config.json. */
export function applyBrand() {
  const root = document.documentElement
  root.style.setProperty('--brand', brand.colors.primary)
  root.style.setProperty('--accent', brand.colors.accent)
  root.style.setProperty('--font-display', `"${brand.fonts.display}"`)
  root.style.setProperty('--font-body', `"${brand.fonts.body}"`)
  document.title = brand.name

  const family = (name, weights) => `family=${name.replaceAll(' ', '+')}:wght@${weights}`
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${family(brand.fonts.display, '500;600;700')}&${family(brand.fonts.body, '400;500;600')}&display=swap`
  document.head.appendChild(link)
}
