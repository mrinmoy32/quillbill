# Server configuration

One file per environment. **Only non-secret, environment-specific values go here.**

| File | Used when | Loaded by |
|------|-----------|-----------|
| `local.config.py` | `APP_ENV=local` (your laptop) | `app/settings.py` |
| `dev.config.py`   | `APP_ENV=dev`   (AWS dev)     | `app/settings.py` |
| `prod.config.py`  | `APP_ENV=prod`  (AWS prod)    | `app/settings.py` |

Each file defines a single dict called `CONFIG`. Keys must match the fields of
`NonSecretConfig` in `app/settings.py` (a typo fails at startup, on purpose).

## Secrets are NOT here
Database URL, Razorpay keys etc. come from **environment variables**:
- local: `server/.env` (git-ignored, copy from `.env.example`)
- dev/prod: Lambda environment variables, populated from AWS SSM Parameter Store / Secrets Manager.
See `docs/AWS_SETUP.md`.
