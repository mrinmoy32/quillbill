# Versioning

Three kinds of version, each with one source of truth.

| What | Where | Example |
|---|---|---|
| **App version** | `VERSION` file at the repo root | `1.4.2` |
| **Build** | git commit SHA, added by the pipeline | `3f9c2ab` |
| **API version** | URL prefix `/api/v1` in `server/app/main.py` | `/api/v1/...` |

## Where you can see the version
- API: `GET /api/v1/health` returns version, build, env. The deploy pipeline checks this to confirm the new build is live.
- Website: sidebar footer (`v1.4.2 · dev`).
- Git: a tag `v1.4.2` is created automatically after each successful **prod** deploy.

## Semantic versioning, plainly
`MAJOR.MINOR.PATCH`
- **PATCH** (1.0.0 → 1.0.1): bug fixes.
- **MINOR** (1.0.0 → 1.1.0): new feature, nothing breaks.
- **MAJOR** (1.0.0 → 2.0.0): breaking change, such as removing an API field that old apps use.

## Release routine
1. Work on `feature/...` branches, merge to `dev`; dev deploys automatically. Test there.
2. When ready for customers: `make bump kind=minor` (or `patch`/`major`), add a line to `CHANGELOG.md`, commit.
3. Merge `dev` into `prod`. The pipeline builds. Open Actions → **Deploy** → branch `prod`, environment `prod` → approve.
4. The pipeline tags `vX.Y.Z`. To roll back, see CICD.md.

## API versioning rule
Adding fields or endpoints is not breaking. Removing/renaming fields or changing meaning is. For that, create `/api/v2` routers next to v1, keep v1 alive until old clients are gone. (The website and API deploy together, so for now this mainly matters once you have a mobile app or API customers.)

## Database migrations are versioned too
Each file in `server/migrations/versions/` is a numbered step. They run in order on every deploy and never run twice. Never edit a migration that has been deployed; add a new one.
