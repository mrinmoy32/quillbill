import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const brand = JSON.parse(readFileSync(path.join(root, 'brand.config.json'), 'utf8'))
const version = readFileSync(path.join(root, 'VERSION'), 'utf8').trim()

/** Replaces %BRAND_NAME% etc. in index.html so the page title comes from brand.config.json. */
const brandHtml = () => ({
  name: 'brand-html',
  transformIndexHtml: (html) =>
    html
      .replaceAll('%BRAND_NAME%', brand.name)
      .replaceAll('%BRAND_DESCRIPTION%', brand.description)
      .replaceAll('%BRAND_COLOR%', brand.colors.primary),
})

export default defineConfig({
  plugins: [react(), brandHtml()],
  // CLIENT_ENV is exposed to the app (Vite only exposes VITE_* by default).
  envPrefix: ['VITE_', 'CLIENT_'],
  resolve: { alias: { '@': path.resolve(here, 'src'), '@brand': path.join(root, 'brand.config.json') } },
  server: { port: 5173, fs: { allow: [root] } },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_SHA__: JSON.stringify((process.env.BUILD_SHA || 'dev').slice(0, 7)),
  },
  test: { environment: 'node' },
})
