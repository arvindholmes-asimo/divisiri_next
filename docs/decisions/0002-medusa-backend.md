# 0002: Medusa as the commerce backend

Date: 2026-11-27. Status: accepted.

## Decisions
- Medusa 2 in `backend/` holds the catalogue, carts, orders and admin. It has its own database.
- The existing Next.js storefront stays. Only its server calls Medusa.
- Payments use Razorpay through our own provider (`backend/src/modules/razorpay`). The pages
  checked showed no official Medusa provider, and the community ones found were version 0.1.x.
- An order is created only after Razorpay's API, or a signed `order.paid` webhook, confirms
  payment. The browser's success message is not trusted.
- Approved prices and the delivery charge live in `catalog/prices.json`. Until a product has a
  price, and delivery and Razorpay are set up, it cannot be ordered.
- Production refuses to sell a product whose claim review is open (`review_open`).
  Review note text is not copied to Medusa, because the store API exposes product metadata.

## Consequences
- The Prisma schema, migrations and seed are no longer used by the storefront. They are kept
  for now and can be removed in a separate change.
- Not done yet: deployment, a production catalogue load (the seed refuses to run in
  production), Redis, order emails, GST invoices, stock tracking and a Content-Security-Policy.
