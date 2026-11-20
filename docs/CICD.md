# CI/CD: how code gets from Git to AWS

## The rules you asked for
| You push to | What happens automatically | How it reaches an environment |
|---|---|---|
| `feature/*`, `sprint-*` | tests + **build** (Docker image stored in AWS ECR) | **Manual** deploy to dev |
| `dev` | tests + build | **Automatic** deploy to dev |
| `prod` | tests + build | **Manual** deploy to prod (with approval) |

Files: `.github/workflows/ci-cd.yml` (build) and `.github/workflows/deploy.yml` (deploy).

## Manually deploying a feature branch to dev
1. Push your branch and wait for the green **CI/CD** run.
2. GitHub → **Actions** → **Deploy** → **Run workflow**.
3. *Use workflow from*: your branch (e.g. `feature/payment-reminders`). *environment*: `dev`. Run.

The deploy takes the latest commit of that branch, so it must have been built. If not, the workflow says so.

## Deploying to prod
Merge to `prod`, wait for the build, then Actions → Deploy → *Use workflow from* `prod`, environment `prod`. Any other branch is rejected. Turn on **Required reviewers** for the `prod` environment (Settings → Environments) so a second click approves it (that can be you).

## What a deploy does, in order
1. Confirms the image for this commit exists.
2. Points the API Lambda and the migration Lambda at that image.
3. **Runs database migrations** (before users reach the new code).
4. Builds the website for the target environment (`CLIENT_ENV=dev|prod`) and uploads it to Amplify.
5. **Smoke test:** calls `/api/v1/health` and checks the live build equals this commit.
6. Prod only: tags `vX.Y.Z` from the `VERSION` file.

## Why the website is rebuilt per environment but the API is not
The API image is identical everywhere; it picks its config from `APP_ENV` set on the Lambda. A website bundle has its config baked in at build time, so it is built for the target (`dev` or `prod`) from the same commit.

## Rolling back
- Fastest: AWS Console → Lambda → your API function → **Image** → *Deploy new image* and choose the previous image tag from ECR (tags are commit SHAs; find the SHA in the earlier Actions run). Do the same for the migrate function.
- Or `git revert` the bad commit on the branch and let the pipeline run.
- Migrations don't roll back automatically. Write migrations to be backward compatible (add columns first, remove them in a later release).

## Required GitHub settings
Repository **variables** (Settings → Secrets and variables → Actions → Variables): `AWS_REGION`, `ECR_REPOSITORY`, `AWS_BUILD_ROLE_ARN`.
Per **environment** (`dev`, `prod`) variables: `AWS_DEPLOY_ROLE_ARN`, `LAMBDA_FUNCTION_NAME`, `MIGRATE_FUNCTION_NAME`, `AMPLIFY_APP_ID`, `AMPLIFY_BRANCH`, `API_URL`.
No AWS keys are stored anywhere: GitHub proves its identity to AWS with OIDC. See AWS_SETUP.md step 8.
