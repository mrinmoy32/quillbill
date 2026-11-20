# Getting started (local development)

You need: Python 3.12, Node 22, Git. **Docker is not needed to develop**; it is only used by the pipeline to package the API. (To learn it, `make docker-build` builds the same image locally.)

Local development uses the **shared dev database on AWS RDS** (no local Postgres). Because of that, give local its own database *inside* the dev instance (see below) so experiments never touch dev data.

## 1. Accounts to create first (all have free tiers)
1. **Clerk** (clerk.com): create an application. This is your *development* instance, used by local + dev.
   - Copy the **Publishable key** (`pk_test_...`) into `client/src/config/local.config.js` and `dev.config.js`.
   - Copy the **Frontend API URL** (looks like `https://xyz.clerk.accounts.dev`) into `clerk_issuer` in `server/config/local.config.py` and `dev.config.py`.
   - Clerk Dashboard > Sessions > *Customize session token*, add: `{ "email": "{{user.primary_email_address}}" }` so we can store the user's email.
2. **AWS RDS database**: follow [AWS_SETUP.md](AWS_SETUP.md) step 3, then come back.

## 2. Create the local database (once)
Connect to the dev RDS instance with any Postgres client and run: `CREATE DATABASE app_local;`

## 3. Configure secrets
```bash
cp server/.env.example server/.env     # then edit: DATABASE_URL (pointing at app_local)
cp client/.env.example client/.env     # contains only CLIENT_ENV=local
```
`.env` files are git-ignored. **Secrets never go in `config/*.config.py|js`.**

## 4. Install and run
```bash
make install
make migrate      # creates the tables in app_local
make server       # API on http://localhost:8000  (Swagger docs: /docs)
make client       # website on http://localhost:5173   (second terminal)
```
Sign up on the website; your business and Free plan are created automatically on first request.

## 5. Tests
`make test` runs server tests (no AWS/Clerk needed; uses in-memory SQLite) and client tests.

## Changing the database
Edit a model in `server/app/modules/<feature>/models.py`, then:
```bash
make migration m="add reminder table"   # generates a migration file. READ IT before committing.
make migrate
```
Deploys apply migrations automatically (see CICD.md). **Never edit the database by hand in dev/prod**: always use a migration.

## Troubleshooting
- *`ValidationError: DATABASE_URL`*: `server/.env` missing or empty.
- *Login works but API returns 401*: `clerk_issuer` in `server/config/local.config.py` doesn't match your Clerk Frontend API URL.
- *CORS error in browser*: add your site's URL to `cors_origins` in the server config for that environment.
- *Can't connect to RDS from your laptop*: the instance's security group must allow port 5432 from your IP.
