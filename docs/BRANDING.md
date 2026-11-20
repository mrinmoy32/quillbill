# Branding: rename or re-skin in one place

Everything lives in [`brand.config.json`](../brand.config.json):

| Key | Used for |
|---|---|
| `name`, `tagline`, `description` | page title, sidebar, sign-in screen, emails, PDF footer, API title |
| `colors.primary`, `colors.accent` | buttons/links and the invoice's top stripe (the UI derives tints from these) |
| `fonts.display`, `fonts.body` | any Google Font name |
| `logo.mark` | path to the logo file inside `client/public/` |
| `supportEmail`, `legalName`, `domain` | available to server and templates |
| `pdfFooter` | the "Created with {name}" line on Free-plan PDFs |

## To rename the product
1. Edit `brand.config.json`.
2. Replace `client/public/brand/logo-mark.svg` (any size; SVG recommended).
3. Update the `email_from` line in `server/config/*.config.py` and the domain placeholders (`quillbill.example`) in config files.
4. Rebuild/deploy. Nothing else hardcodes the name.

The name is never typed anywhere else in code. The client reads the file at build time (`vite.config.js` also injects it into `index.html`); the server reads it at startup (`app/settings.py`). Strings in `en.json` never contain the product name for the same reason.

Check before launch: trademark search (India: IP India; global: WIPO), domain availability, and social handles.
