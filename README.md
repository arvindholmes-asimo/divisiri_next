# DiviSiri Shop

The online shop for `shop.divisiri.com`. It is separate from the `divisiri.com` static site.

## Requirements
- Node.js 24 (see `.nvmrc`; 22.12 or later also works)
- Docker Desktop or Docker Engine with Compose

## First run
```bash
cp .env.example .env
npm ci
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev
```
Open http://localhost:3000. http://localhost:3000/api/health returns `{"status":"ok"}`
when the database is reachable.

The local database listens on `127.0.0.1:5433`. To use another port, set `SHOP_DB_PORT`
in your shell and change the port in `DATABASE_URL`.

## Commands
| Command | Purpose |
|---|---|
| `npm run check` | Lint, type check, boundary check and unit tests |
| `npm run test:integration` | Tests against the local database |
| `npm run build` | Production build (needs no secrets) |
| `npm run db:migrate` | Create and apply a migration after editing the schema |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:seed` | Load `catalog/catalog.json` (development and test only) |
| `npm run images:import -- <folder>` | Replace product photos (see `docs/product-photos.md`) |
| `npm run catalog:import -- <mockup.html>` | Re-extract the catalogue from the design mockup |
| `npm run secrets:scan` | Scan committable files for secrets (needs Docker) |

## Layout
```
src/app/          pages and route handlers
src/components/   shared page parts
src/modules/      business logic, one folder per domain
catalog/          product data extracted from the design
public/products/  product photos, named by product
src/lib/          environment validation and database client
prisma/           schema and migrations
tests/            unit, integration and fakes
scripts/          repository checks
infra/docker/     local database
docs/decisions/   recorded decisions
```
More modules and vendor clients (`src/integrations/`) are added by the milestones that need them.

Products load as drafts. Development shows drafts; production shows published products only.
Prices stay empty until approved ones exist.

## Rules
- Secrets live in `.env` locally and are supplied at run time elsewhere. Never commit them.
- Never give a secret a `NEXT_PUBLIC_` name.
- Fake services live only in `tests/fakes/`.
- Import `server-only` in any module that reads secrets or calls a vendor.
- The server exits at startup if its configuration is invalid.
