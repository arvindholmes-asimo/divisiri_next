# 0001: Launch scope

Date: 2026-11-26. Status: accepted.

## Decisions
- The shop is served at `shop.divisiri.com`.
- The shop and the static site are separate systems. The only connection is the
  static site's Shop button, which links to the shop. They share no code, build,
  deployment, database, session, cart or analytics property.
- Checkout is guest only at launch.
- Cash on delivery is not offered at launch. Shop pages must not promise it.

## Consequences
- No customer account tables or sign-up screens before launch. Admin login is separate.
- Every launch order is prepaid, so order states have no cash-collection path.
- The Shop button is repointed at launch, not before.
