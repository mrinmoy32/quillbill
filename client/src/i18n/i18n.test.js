// Fails the build if the code asks for a translation key that doesn't exist in en.json.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import en from './locales/en.json'

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : /\.jsx?$/.test(p) && !p.endsWith('.test.js') ? [p] : []
})
const lookup = (key) => key.split('.').reduce((obj, part) => obj?.[part], en)
// Plurals are stored as key_one / key_other, so accept either form.
const has = (key) => lookup(key) !== undefined || lookup(`${key}_one`) !== undefined

it('every t("...") key used in the code exists in en.json', () => {
  const missing = []
  for (const file of walk(src)) {
    for (const [, key] of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!has(key)) missing.push(`${path.relative(src, file)}: ${key}`)
    }
  }
  expect(missing).toEqual([])
})
