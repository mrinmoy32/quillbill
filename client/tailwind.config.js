/** Colors come from CSS variables that src/config/brand.js sets from brand.config.json.
 *  Change brand.config.json and the whole UI re-colors; no Tailwind edits needed. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          strong: 'color-mix(in srgb, var(--brand) 82%, black)',
          soft: 'color-mix(in srgb, var(--brand) 9%, white)',
          line: 'color-mix(in srgb, var(--brand) 22%, white)',
        },
        accent: 'var(--accent)',
        ink: { DEFAULT: '#14213D', soft: '#475467', mute: '#667085' },
        canvas: '#F5F6FA',
        line: '#E4E7EC',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
