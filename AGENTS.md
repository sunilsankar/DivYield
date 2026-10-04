# DivYield — OpenCode Agent Instructions

Read `docs/SPECIFICATION.md` before writing application code.

## Mission

Build DivYield as a fast, smooth, lightweight portfolio and dividend tracker.

## Stack

Web:
- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:
- FastAPI
- SQLite
- keyring
- cryptography

Do not introduce Next.js, PostgreSQL, Prisma, Docker, or unnecessary infrastructure.

## CRITICAL: TRADING 212 IS READ-ONLY

Required permissions:

```text
Account data              ON
History                   ON
History - Dividends       ON
History - Orders          ON
History - Transactions    ON
Metadata                  ON
Orders - Execute         OFF
```

The application MUST work with `Orders - Execute` disabled.

Never implement:
- buy
- sell
- place order
- execute order
- cancel order
- modify order
- money transfer
- account mutation

No trading routes. No trading UI. No provider mutation methods.

Create an explicit read-operation allowlist and automated tests proving no mutation capability exists.

## DATA OWNERSHIP

Trading 212:
- actual holdings
- transactions
- order history
- received dividends
- account information

EODHD:
- instrument enrichment
- ticker mapping support
- future dividend events

Local:
- mappings
- analytics
- tax calculations
- cached data
- manual records

## PRIMARY WORKFLOW

`Sync Now` must:
1. synchronize all available Trading 212 holdings
2. synchronize Trading 212 history
3. synchronize actual dividends
4. resolve instruments
5. enrich through EODHD
6. store future dividend events
7. update query cache
8. return provider-specific results

Sync must be idempotent and non-blocking to the UI. Never run concurrent sync jobs.

## SECURITY

Never store provider secrets in localStorage, sessionStorage, IndexedDB, plaintext SQLite, source code, frontend env vars, or logs.

Use OS keychain through FastAPI.

Never return raw credentials after save.

## PERFORMANCE

DivYield must feel fast:
- parallelize independent provider requests
- batch SQLite writes
- use indexes
- cache server data
- lazy-load secondary pages
- virtualize large transaction lists
- debounce filters
- avoid unnecessary React renders
- keep charts efficient
- keep UI interactive during sync

## MOBILE

Do not build mobile in v1.

The API must be versioned under `/api/v1` so future React Native + Expo Android/iOS clients can reuse it.

Do not put Trading 212/EODHD logic in React.

## TAX

Initial jurisdiction: Netherlands.

Tax is locally calculated from synchronized source data. Version rules by year. Never present estimates as official liabilities.

## IMPLEMENTATION ORDER

1. Foundation
2. Secure API connections
3. Trading 212 read-only integration
4. EODHD integration
5. Mapping + combined sync
6. Core UI
7. Planning + analysis
8. Tax
9. CSV/manual/interest
10. Performance/polish
11. Mobile preparation

Implement one phase at a time.

After each phase:
- test
- typecheck
- lint
- verify startup
- fix failures
- update docs if needed

## DEFINITION OF DONE

A feature requires backend, frontend, persistence where needed, loading/empty/error states, tests, and security review.

Do not declare a feature complete because the UI renders.
