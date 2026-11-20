# Quillbill

> "Quillbill" is a **placeholder name**. Change it in one file: [`brand.config.json`](brand.config.json). See [docs/BRANDING.md](docs/BRANDING.md).

Simple invoicing for small businesses (India first, built for the world). Version 1 features: sign up, business profile, clients, invoices with GST/tax and discounts, PDF, share link, email, free and Pro plans.

## Repo map

```
brand.config.json   product name, colors, logo, fonts   (single source of truth)
VERSION             app version, e.g. 1.0.0             (single source of truth)
server/             Python FastAPI API (runs on AWS Lambda in a Docker image)
  config/           local.config.py, dev.config.py, prod.config.py   (non-secret, per environment)
  app/modules/      ONE FOLDER PER FEATURE: router.py, service.py, models.py, schemas.py
  migrations/       database changes (Alembic)
client/             React website (Vite + Tailwind)
  src/config/       local.config.js, dev.config.js, prod.config.js   (no secrets, ever)
  src/features/     ONE FOLDER PER FEATURE (mirrors the server modules)
  src/routes.jsx    add a page = add one line
.github/workflows/  ci-cd.yml (build), deploy.yml (deploy)
docs/               guides, start with GETTING_STARTED.md
```

## Start here
1. [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md): run it on your laptop
2. [docs/AWS_SETUP.md](docs/AWS_SETUP.md): one-time cloud setup, written for AWS beginners
3. [docs/CICD.md](docs/CICD.md): how branches build and deploy
4. [docs/ADD_A_FEATURE.md](docs/ADD_A_FEATURE.md): how to grow the product
5. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the pieces fit, and why
6. [docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md): getting your first 10 paying customers

`make help` lists the common commands.
