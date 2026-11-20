# Architecture

```
Browser (React) ──► AWS Amplify (CDN + HTTPS)          Clerk (login)
      │                                                    ▲
      ▼ HTTPS + Clerk token                                │ public keys (JWKS)
API Gateway (HTTP API) ──► Lambda: FastAPI (Docker image) ─┘
                              ├─► Postgres (RDS)         one instance for local+dev, one for prod
                              ├─► SES (email)            Razorpay ──webhook──► /api/v1/billing/webhook
                              └─► logs: CloudWatch
```

## Environments
| | local | dev | prod |
|---|---|---|---|
| Where | your laptop | AWS | AWS |
| Database | dev RDS instance, db `app_local` | dev RDS instance, db `app_dev` | prod RDS instance |
| Server config | `server/config/local.config.py` | `dev.config.py` | `prod.config.py` |
| Client config | `client/src/config/local.config.js` | `dev.config.js` | `prod.config.js` |
| Secrets | `server/.env` | Lambda env vars | Lambda env vars |
| Selected by | `APP_ENV=local` / `CLIENT_ENV=local` | set on the Lambda / by pipeline | same |

**Config vs secrets:** config = anything safe to read in GitHub (URLs, limits, flags). Secrets = anything that grants access (DB password, API keys). The website bundle is public, so it has *no* secrets; the Clerk publishable key is designed to be public.

## Server layering (the one rule to remember)
`router.py` (HTTP in/out) → `service.py` (business rules, DB queries) → `models.py` (tables).
Routers never query the database; services never know about HTTP. `schemas.py` defines what goes in and out of the API.

## Multi-tenancy
A **business** is the tenant. Every table has `business_id`; every service function receives a `Tenant` (resolved from the login token in `core/deps.py`) and filters by `tenant.business_id`. `tests/test_invoices_api.py::test_tenant_isolation` guards this. Keep that test passing when you add features.

## Money
Integers in the smallest unit (paise/cents), never floats. Formatting happens at the edges (`lib/money.js`, `pdf/invoice_pdf.py`) using the business's currency and locale. The maths lives in `calculations.py` and is mirrored in `client/src/lib/invoiceMath.js`; both have matching tests.

## Internationalization (built in from day one)
- Text: every UI string is a key in `client/src/i18n/locales/en.json` (a test fails if a key is missing). Add a language by adding a file.
- Money/dates: per-business `currency` and `locale`.
- Tax: per-business `tax_label` ("GST", "VAT") and `tax_id`.
- Not yet: CGST/SGST/IGST split, e-invoicing/IRN, right-to-left layouts, non-Latin PDF fonts. See "Known limits".

## Versioning
`VERSION` file → API `/api/v1/health`, API docs, website footer, git tag `vX.Y.Z` on prod deploy. API URLs carry `/api/v1`; only a breaking API change creates `/api/v2`. Details: [VERSIONING.md](VERSIONING.md).

## Why not Kubernetes / Kafka / Redis yet?
Not needed at this scale; each adds cost and operations work. The API is a normal FastAPI app, so moving to containers on ECS/Kubernetes later is a packaging change. Add Redis when you measure a slow endpoint or need rate limits; add a queue (SQS) when you build payment reminders.

## Known limits of v1 (deliberate)
- Invoices reference the *live* client record: editing a client changes how old invoices render. (Fix when needed: snapshot client details at send time.)
- One user per business (no teams). Schema is ready: users already link to a business.
- Business logo is a URL, not an upload (S3 upload is a good next task).
- Dashboard totals are computed in Python (fine up to thousands of invoices per business).
- No automated end-to-end tests of Clerk login, Razorpay or SES: test those by hand on dev.
