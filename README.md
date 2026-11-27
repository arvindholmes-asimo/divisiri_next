# DiviSiri Shop

The online shop for `shop.divisiri.com`. It is separate from the `divisiri.com` static site.

## Requirements
- Node.js 24 (see `.nvmrc`; 22.22 or later also works)
- Docker Desktop or Docker Engine with Compose

## Parts
| Part | Folder | Local address |
|---|---|---|
| Storefront (Next.js) | `.` | http://localhost:3000 |
| Commerce backend (Medusa) | `backend/` | http://localhost:9000, admin at `/app` |

## First run
Backend:
```bash
npm run db:up
docker compose -f infra/docker/compose.yml exec db createdb -U shop medusa
cd backend
cp .env.example .env
npm ci
npm run migrate
npm run seed        # prints MEDUSA_PUBLISHABLE_KEY
npx medusa user -e <your email> -p <a password you choose>   # admin login
npm run dev
```
Storefront, in a second terminal at the repository root:
```bash
cp .env.example .env   # then paste MEDUSA_PUBLISHABLE_KEY
npm ci
npm run dev
```
http://localhost:3000/api/health returns `{"status":"ok"}` when the backend is reachable.

The local database listens on `127.0.0.1:5433`. To use another port, set `SHOP_DB_PORT`
in your shell and change the port in both `DATABASE_URL` values.

## Opening checkout locally
1. Put approved prices and the delivery charge in `catalog/prices.json`, in rupees, tax included.
   Each priced product needs both `mrp` and `price`.
2. Put Razorpay **test** keys in `backend/.env` and restart the backend.
3. Run `npm run seed` in `backend/`.

Setting a value back to `null` does not remove a price already loaded. Remove it in the admin.

Razorpay cannot send webhooks to `localhost`. The webhook (URL
`<backend>/hooks/payment/razorpay_razorpay`, event `order.paid`) matters on a deployed
backend: it creates the order if a shopper pays and then closes the page.

## Commands
| Where | Command | Purpose |
|---|---|---|
| root | `npm run check` | Lint, type check, boundary check and unit tests |
| root | `npm run test:integration` | Tests against the running backend and local database |
| root | `npm run build` | Production build (needs no secrets) |
| root | `npm run images:import -- <folder>` | Replace product photos (see `docs/product-photos.md`) |
| root | `npm run catalog:import -- <mockup.html>` | Re-extract the catalogue from the design mockup |
| root | `npm run secrets:scan` | Scan committable files for secrets (needs Docker) |
| backend | `npm run seed` | Load the catalogue and prices (development and test only) |
| backend | `npm test`, `npm run typecheck` | Backend unit tests and type check |

The root `db:migrate`, `db:deploy`, `db:generate` and `db:seed` commands belong to the
earlier Prisma schema, which the storefront no longer uses
(see `docs/decisions/0002-medusa-backend.md`).

## Layout
```
src/app/          pages and route handlers
src/components/   shared page parts
src/modules/      business logic, one folder per domain
src/lib/          environment validation, backend client
backend/          Medusa: payment provider, sales gate, catalogue seed
catalog/          product data and approved prices
public/products/  product photos, named by product
tests/            unit, integration and fakes
scripts/          repository checks
infra/docker/     local database
docs/decisions/   recorded decisions
```

The catalogue seed lists every product in the local backend. A product with an open
`reviewNotes` entry in `catalog/catalog.json` cannot be seen or bought in production.
After closing a note, run the seed again. Prices stay empty until approved ones exist.

## Rules
- Secrets live in `.env` locally and are supplied at run time elsewhere. Never commit them.
- Never give a secret a `NEXT_PUBLIC_` name.
- Fake services live only in `tests/fakes/`.
- Import `server-only` in any module that reads secrets or calls a vendor.
- The server exits at startup if its configuration is invalid.
