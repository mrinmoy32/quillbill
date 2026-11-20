# Shortcuts. Run `make help`.
.PHONY: help install server client test migrate migration docker-build bump

help:            ## Show this help
	@grep -E '^[a-z-]+:.*##' Makefile | awk -F':.*## ' '{printf "  make %-14s %s\n", $$1, $$2}'

install:         ## Install server + client dependencies
	cd server && python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
	cd client && npm install

server:          ## Run the API locally on :8000 (reads server/.env)
	cd server && .venv/bin/uvicorn app.main:app --reload --port 8000

client:          ## Run the website locally on :5173
	cd client && npm run dev

test:            ## Run all tests
	cd server && .venv/bin/python -m pytest
	cd client && npm test

migrate:         ## Apply database migrations to the DB in server/.env
	cd server && .venv/bin/alembic upgrade head

migration:       ## Create a migration after changing a model:  make migration m="add reminders"
	cd server && .venv/bin/alembic revision --autogenerate -m "$(m)"

docker-build:    ## Build the API image locally (to learn Docker / test the Lambda image)
	docker build -f server/Dockerfile -t app-api:local .

bump:            ## Bump version:  make bump kind=minor
	python scripts/bump_version.py $(kind)
