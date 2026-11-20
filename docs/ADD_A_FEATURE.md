# Adding a feature (worked example: "payment reminders")

The pattern is always the same, and the `invoices` module is the reference.

## Server
1. Create `server/app/modules/reminders/` with `models.py`, `schemas.py`, `service.py`, `router.py` (copy `clients/`, the smallest one).
2. Tables: give every table `business_id` and filter by `tenant.business_id` in every service function.
3. Register: add the model import to `app/models.py` and the router to `ROUTERS` in `app/main.py`.
4. `make migration m="add reminders"` → read the generated file → `make migrate`.
5. Write tests in `server/tests/` (copy the style of `test_invoices_api.py`, including a tenant-isolation test).
6. Gate it by plan if it is Pro-only: add a check in `billing/service.py` next to `assert_can_create_invoice`.

## Client
1. Create `client/src/features/reminders/` with a page component. Call the API through a new group in `src/api/index.js`.
2. Add one object to `appRoutes` in `src/routes.jsx` (set `nav` to show it in the menu).
3. Add every visible string to `src/i18n/locales/en.json` and use `t('reminders.title')`. `npm test` fails if a key is missing.
4. Reuse components from `src/components/ui` (Button, Card, Input, Modal...). Use brand colors via Tailwind classes `bg-brand`, `text-brand`; never hardcode a hex color.

## Background jobs (for reminders)
Don't add Kafka. Use **EventBridge Scheduler** (a daily trigger) invoking a third Lambda from the same image (like `migrate_handler.py`), with a handler such as `app.jobs.send_reminders.handler`. Add **SQS** only if you need retries or high volume.

## Definition of done
Tests pass, new strings are in `en.json`, migration reviewed, `CHANGELOG.md` updated, `VERSION` bumped when releasing.

## Conventions
- Small functions with plain names; comments explain *why*, not *what*.
- API errors: raise `NotFound`, `Conflict`, etc. from `core/errors.py`; don't return error dicts by hand.
- Money is an integer in the smallest unit. Dates are `YYYY-MM-DD` strings in the API.
