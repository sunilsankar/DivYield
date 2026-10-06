# DivYield — Complete Product & Engineering Specification

**Version:** 1.0  
**Date:** 2026-10-02  
**Target:** OpenCode  
**Platforms:** Web first; Android and iOS later

## 1. Product

DivYield is a fast, smooth, lightweight, local-first portfolio and dividend tracker.

It synchronizes the user's real portfolio from **Trading 212 using a strictly read-only API key & API secret**, then enriches owned securities with **Yahoo Finance** dividend and sector information (zero external API keys required).

The product is:
1. A lightweight desktop application (Windows MSI and macOS DMG).
2. A standalone native Android app (APK).
3. A local-first web application.

The architecture separates UI, application API, and provider integrations so mobile clients and desktop apps reuse the same design principles and database schemas.

## 2. Core Workflow

```text
Configure Trading 212 READ-ONLY API Key & Secret
        ↓
     Sync Now
        ↓
Trading 212 → all holdings / history / received dividends
        ↓
Extract instruments & map tickers
        ↓
Yahoo Finance → dividend history + upcoming declaration projections
        ↓
SQLite
        ↓
Dashboard / Dividends / Calendar / Planning / Diversification / Tax / Security Lock
```
```

The user does not manually enter normal holdings or tickers.

## 3. Non-Negotiable Requirements

1. Lightweight and fast.
2. Vite + React + TypeScript frontend.
3. Tailwind CSS + shadcn/ui.
4. FastAPI backend.
5. SQLite.
6. Trading 212 access is strictly read-only.
7. Trading 212 `Orders - Execute` permission must remain disabled.
8. No buy/sell/order mutation functionality.
9. EODHD enriches the Trading 212 portfolio.
10. One primary Sync Now workflow.
11. Sync is idempotent.
12. Provider failures are isolated.
13. Received and expected dividends are separate.
14. Portfolio allocation is graphical.
15. Tax is jurisdiction-aware and locally calculated.
16. Initial tax jurisdiction is Netherlands.
17. Credentials are configured through the GUI.
18. Raw provider secrets never persist in browser storage.
19. Backend is the shared API for future mobile clients.
20. No unnecessary cloud or multi-user infrastructure in v1.

## 4. Technology

### Web
- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- TanStack Table
- Recharts
- React Hook Form
- Zod
- Zustand
- Lucide React

### Backend
- Python 3.12+
- FastAPI
- Uvicorn
- httpx
- Pydantic
- SQLite
- keyring
- cryptography

### Testing
- pytest
- Vitest
- Playwright

### Mobile later
- React Native + Expo
- Android + iOS
- Same versioned FastAPI API

Do not introduce Next.js, PostgreSQL, Prisma, Docker, or unnecessary infrastructure.

## 5. Architecture

```text
                       DivYield
                           │
             ┌─────────────┴─────────────┐
             │                           │
        Client Apps                Shared API
             │                           │
      ┌──────┼──────┐                    │
      │      │      │                    ▼
     Web  Android  iOS              FastAPI
      │      │      │                    │
      └──────┴──────┘          ┌─────────┼─────────┐
                               │         │         │
                          Trading 212   EODHD    SQLite
                          READ ONLY
```

Web: `Vite React → FastAPI → Providers/SQLite`

Future mobile: `React Native → FastAPI → Providers/SQLite`

Provider integration logic must not be duplicated in mobile apps.

## 6. Repository

```text
divyield/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   ├── dashboard/
│   │   │   ├── charts/
│   │   │   ├── dividends/
│   │   │   ├── mappings/
│   │   │   ├── settings/
│   │   │   └── tax/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── types/
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── credentials.py
│   │   ├── providers/
│   │   │   ├── trading212.py
│   │   │   └── eodhd.py
│   │   ├── services/
│   │   │   ├── sync.py
│   │   │   ├── portfolio.py
│   │   │   ├── dividends.py
│   │   │   ├── mapping.py
│   │   │   ├── analytics.py
│   │   │   ├── tax.py
│   │   │   └── export.py
│   │   └── routers/
│   │       ├── health.py
│   │       ├── credentials.py
│   │       ├── sync.py
│   │       ├── portfolio.py
│   │       ├── transactions.py
│   │       ├── dividends.py
│   │       ├── calendar.py
│   │       ├── mappings.py
│   │       ├── analytics.py
│   │       ├── tax.py
│   │       └── export.py
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
├── docs/
│   ├── SPECIFICATION.md
│   ├── API.md
│   ├── TAX.md
│   └── DEVELOPMENT.md
├── data/
│   └── .gitkeep
├── opencode/
│   └── HANDOFF.md
├── AGENTS.md
├── README.md
├── .env.example
└── .gitignore
```

## 7. Trading 212 — Strict Read-Only

Required Trading 212 API permissions:

```text
Account data              ON
History                   ON
History - Dividends       ON
History - Orders          ON
History - Transactions    ON
Metadata                  ON
Orders - Execute         OFF
```

The application must work with `Orders - Execute` disabled.

### Allowed
- Account summary
- Portfolio / holdings
- Metadata
- Order history
- Transaction history
- Dividend history

### Forbidden
- Buy
- Sell
- Place/execute order
- Cancel order
- Modify order
- Money transfer
- Any account mutation

The Trading 212 provider must expose read methods only. No trading routes or UI exist. Automated tests must prove this.

All Trading 212 calls live in `backend/app/providers/trading212.py`.

## 8. Trading 212 IP Access

If the user has a stable public IP, restricting the Trading 212 key to that trusted IP is recommended.

If the public IP changes dynamically, unrestricted access may be necessary.

IP restriction is configured at Trading 212, not in DivYield.

## 9. Credentials

Trading 212 GUI:

```text
Trading 212
────────────────────────
API Key       [••••••••]
API Secret    [••••••••]
Environment   [Live ▼]

Expected permissions:
✓ Account data
✓ History
✓ History - Dividends
✓ History - Orders
✓ History - Transactions
✓ Metadata
✗ Orders - Execute

[Test Connection] [Save] [Disconnect]
```

EODHD GUI:

```text
EODHD
────────────────────────
API Token      [••••••••]

[Test Connection] [Save] [Disconnect]
```

Primary credential storage: OS keychain via `keyring`.

Fallback: encrypted local storage using Fernet.

Never store secrets in localStorage, sessionStorage, IndexedDB, plaintext SQLite, source code, frontend environment variables, logs, telemetry, or normal API responses.

## 10. Provider Validation

Trading 212: perform a real authenticated read request.

Report:
- Connected
- Invalid credentials
- Access denied
- Rate limited
- Provider unavailable
- Network failure

EODHD: validate authentication, required instrument access, and required dividend/calendar access.

A valid EODHD token without dividend access must show:

```text
✓ Connected
⚠ Dividend Calendar Unavailable
```

## 11. Trading 212 Sync

Trading 212 is authoritative for:
- holdings
- quantities
- account data
- order history
- transaction history
- actual received dividends

Retrieve all available records using pagination. Do not arbitrarily cap holdings. Use stable external IDs to prevent duplicates. Handle provider rate limits with bounded retries.

## 12. EODHD Enrichment

After Trading 212 synchronization:

```text
Trading 212 holdings
        ↓
Unique instruments
        ↓
Mapping
        ↓
EODHD
```

Retrieve, where available:
- instrument metadata
- ticker/symbol
- dividend history
- dividend amount
- currency
- declaration date
- ex-dividend date
- record date
- payment date
- future scheduled dividend events

Normal sync only requests portfolio-owned securities.

## 13. Instrument Mapping

Priority:
1. Exact ticker.
2. Exchange-qualified ticker.
3. ISIN/stable identifier.
4. Existing mapping.
5. Manual mapping.

Unmatched securities do not stop sync.

```text
2 securities need mapping

[Review mappings]
```

Mappings persist between syncs.

## 14. One-Click Sync

Primary action:

`[ Sync Now ]`

Endpoint:

`POST /api/v1/sync`

Workflow:

```text
Trading 212
    ↓
All holdings
    ↓
Orders/history
    ↓
Transactions/history
    ↓
Received dividends
    ↓
Extract instruments
    ↓
Resolve mappings
    ↓
EODHD
    ↓
Dividend/instrument enrichment
    ↓
Future dividend events
    ↓
SQLite
    ↓
Update query cache
```

The UI remains responsive. Never run concurrent sync jobs.

## 15. Sync Progress

```text
Syncing...

✓ Connecting to Trading 212
✓ Importing holdings
✓ Importing transactions
✓ Importing received dividends
● Enriching securities with EODHD
○ Updating future dividends
```

Result:

```text
Sync completed

Trading 212
✓ 18 holdings
✓ 246 transactions
✓ 37 received dividends

EODHD
✓ 18 matched securities
✓ 42 future dividend events

Last synced
2 Oct 2026 · 14:25
```

## 16. Failure Isolation

Trading 212 succeeds / EODHD fails:
- save Trading 212 data
- preserve previous EODHD data
- show partial success
- allow EODHD retry

Trading 212 fails:
- preserve existing local data
- do not erase portfolio
- do not infer holdings from EODHD

EODHD fails:
- preserve existing enrichment

## 17. Database

### holdings

```sql
CREATE TABLE IF NOT EXISTS holdings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL DEFAULT 'trading212',
    external_id TEXT,
    ticker TEXT,
    name TEXT,
    isin TEXT,
    currency TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    average_price REAL DEFAULT 0,
    current_price REAL DEFAULT 0,
    market_value REAL DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, external_id)
);
```

### transactions

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    ticker TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    price REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    fees REAL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    external_id TEXT,
    source TEXT NOT NULL DEFAULT 'TRADING212',
    notes TEXT,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions(ticker);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external
ON transactions(external_id) WHERE external_id IS NOT NULL;
```

### dividend_events

```sql
CREATE TABLE IF NOT EXISTS dividend_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    declaration_date TEXT,
    ex_dividend_date TEXT,
    record_date TEXT,
    payment_date TEXT,
    amount REAL,
    currency TEXT,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'EXPECTED',
    external_id TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dividend_events_ticker ON dividend_events(ticker);
CREATE INDEX IF NOT EXISTS idx_dividend_events_payment_date ON dividend_events(payment_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dividend_events_external
ON dividend_events(source, external_id) WHERE external_id IS NOT NULL;
```

### instrument_mappings

```sql
CREATE TABLE IF NOT EXISTS instrument_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trading212_identifier TEXT NOT NULL UNIQUE,
    trading212_ticker TEXT,
    eodhd_symbol TEXT NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'MANUAL',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### sync_log

```sql
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    external_id TEXT NOT NULL,
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, entity_type, external_id)
);
```

### settings

```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

Defaults:

```text
base_currency=EUR
tax_jurisdiction=NL
sync_frequency=manual
```

## 18. Dividends

Received:
- Trading 212 source
- actual dividend reported as received

Expected:
- EODHD source
- future/scheduled event

Never count expected dividends as received.

Estimated future income:

`dividend per share × current eligible quantity`

Clearly label estimates.

## 19. Dividend Calendar

Display:
- date
- ticker
- ex-dividend date
- record date
- payment date
- dividend/share
- estimated total
- status

Views:
- Month
- Year
- List

Filters:
- All
- Received
- Expected
- Ticker

## 20. Dividend Reconciliation

When a Trading 212 dividend corresponds to an EODHD expected event:
1. Match instrument.
2. Compare relevant dates.
3. Compare amount where appropriate.
4. Mark expected event received.
5. Preserve EODHD event.
6. Keep Trading 212 as actual-payment authority.

If confidence is insufficient, do not force a match.

## 21. Portfolio Graphics

The Overview must include a graphical donut/pie allocation chart.

Center:

```text
Portfolio Value
€25,430
```

Segments show ticker and percentage.

Hover shows:
- ticker
- name
- market value
- percentage

Click opens holding details.

Group very small positions into `Other` where appropriate.

Analysis must include:
- portfolio allocation donut
- portfolio value line chart
- monthly dividend bar chart
- annual dividend growth line chart
- future dividend chart
- income by holding
- portfolio concentration

Use Recharts.

## 22. Dashboard

```text
DivYield

Portfolio Value     €25,430
Cost Basis          €21,200
Unrealized P/L       €4,230
Received Dividends     €812

Total Return         €5,042

[Allocation Donut]     [Dividend Chart]

Holdings
────────────────────────────────────────
Ticker  Qty  Avg Cost  Value  P/L  Yield
AAPL    ...
MSFT    ...
...
```

Also show provider status, last sync, and Sync Now.

## 23. Transactions

Columns:
- Date
- Ticker
- Type
- Quantity
- Price
- Amount
- Fees
- Currency
- Source

Sources:
- TRADING212
- MANUAL
- CSV

## 24. Manual Transactions

Support:
- Buy
- Sell
- Dividend
- Fee
- Interest
- Other cash movement

Manual records must be marked `MANUAL`.

## 25. Trading 212 CSV Import

Settings → Data → Import CSV.

Requirements:
- validate file
- preview before import
- deduplicate
- identify unsupported rows
- show summary
- source = CSV

Importing the same file twice must not duplicate records.

API sync remains primary.

## 26. Interest Tracking

Track interest separately:

```text
Income
├── Dividends
└── Interest
```

Do not mix interest into dividend-specific analytics.

## 27. Planning

### Yield on Cost
- ticker
- cost basis
- annual dividend
- yield on cost

### Dividend Frequency
- ticker
- payments
- total
- average payment
- first
- last

### Forward Income
- ticker
- projected annual
- projected monthly
- expected next payment

## 28. Tax

Initial jurisdiction: Netherlands.

Architecture:

```text
TaxEngine
└── NetherlandsTaxCalculator
```

Rules are versioned by tax year.

Every report includes:
- jurisdiction
- tax year
- status
- source-data date
- assumptions

Example:

```text
Jurisdiction: Netherlands
Tax year: 2026
Status: Estimate
```

Never present an application estimate as an official tax liability.

## 29. Performance

DivYield must feel fast and smooth.

Targets:
- App shell < 1 sec
- Cached dashboard < 500 ms
- Local filtering < 100 ms perceived
- Cached navigation near-instant
- Normal SQLite queries typically < 100 ms

Requirements:
- async provider calls
- parallel independent requests
- batched SQLite writes
- indexes
- cached server state
- lazy-load heavy pages/charts
- virtualize large transaction tables
- debounce filters
- avoid unnecessary React renders
- efficient chart data
- responsive UI during sync
- skeletons instead of blocking full-page spinners

## 30. API for Future Mobile

Base path:

`/api/v1/`

Routes:

```text
GET  /api/v1/health
GET  /api/v1/connections

POST /api/v1/credentials/trading212
POST /api/v1/credentials/trading212/test
DELETE /api/v1/credentials/trading212

POST /api/v1/credentials/eodhd
POST /api/v1/credentials/eodhd/test
DELETE /api/v1/credentials/eodhd

POST /api/v1/sync

GET  /api/v1/portfolio
GET  /api/v1/holdings
GET  /api/v1/transactions
GET  /api/v1/dividends
GET  /api/v1/dividends/expected
GET  /api/v1/calendar

GET  /api/v1/mappings
POST /api/v1/mappings
DELETE /api/v1/mappings/{id}

GET /api/v1/analytics/allocation
GET /api/v1/analytics/dividends
GET /api/v1/analytics/value

GET /api/v1/tax/summary
GET /api/v1/tax/report

GET /api/v1/export/transactions
GET /api/v1/export/dividends
GET /api/v1/export/yahoo
```

No Trading 212 order execution route.

## 31. Mobile Roadmap

Do not build mobile in v1.

Later:
- React Native + Expo
- Android
- iOS
- secure device storage
- biometric unlock
- offline portfolio cache
- push notifications
- widgets

Mobile consumes the same API and does not duplicate provider integration.

## 32. Security

1. Trading 212 read-only.
2. `Orders - Execute` OFF.
3. No mutation endpoints.
4. No buy/sell UI.
5. Explicit provider read allowlist.
6. OS keychain credential storage.
7. No browser credential persistence.
8. No secrets in logs.
9. No raw credentials in API responses.
10. Localhost backend by default in v1.
11. Restrictive CORS.
12. Validate all inputs.
13. Do not log sensitive provider responses.
14. Future mobile uses secure device storage.

## 33. Testing

Security:
- read-only provider
- no mutation methods
- no mutation routes
- execution permission not required
- sync only reads Trading 212

Backend:
- credentials
- authentication
- pagination
- rate limits
- idempotency
- mappings
- reconciliation
- analytics
- tax
- exports
- failure isolation

Frontend:
- forms
- connection states
- sync progress
- charts
- allocation
- calendar
- expected/received
- mapping
- CSV import
- manual transactions

E2E:
```text
Open DivYield
→ configure read-only Trading 212
→ test
→ save
→ configure EODHD
→ test
→ save
→ Sync Now
→ see holdings
→ see allocation chart
→ see received dividends
→ see future dividends
→ calendar
→ planning
→ tax
→ export
```

## 34. Implementation Phases

### Phase 1 — Foundation
Vite, React, TypeScript, Tailwind, shadcn/ui, FastAPI, SQLite, API v1, app shell.

### Phase 2 — Secure Connections
Trading 212 GUI, EODHD GUI, keychain, validation, masked status.

### Phase 3 — Trading 212 Read-Only
Provider, read allowlist, account, holdings, metadata, order history, transactions, dividends, pagination, rate limits, security tests.

### Phase 4 — EODHD
Provider, validation, instrument enrichment, dividend history, future events.

### Phase 5 — Sync + Mapping
Automatic mapping, manual mappings, combined sync, progress, failure isolation, retry, idempotency.

### Phase 6 — Core UI
Dashboard, holdings, transactions, dividends, calendar, graphical allocation.

### Phase 7 — Planning + Analysis
Yield, frequency, forward income, value, dividend growth, allocation, concentration.

### Phase 8 — Tax
Netherlands architecture, tax-year rules, summary, export.

### Phase 9 — Data Tools
CSV import, manual transactions, interest tracking, data management.

### Phase 10 — Performance + Polish
Caching, virtualization, lazy loading, accessibility, responsive design, error states, E2E and performance testing.

### Phase 11 — Mobile Preparation
Verify API contracts, authentication strategy, mobile-safe response models, offline/cache model.

Do not build Android/iOS yet.

## 35. Acceptance Criteria

1. DivYield runs locally.
2. Web UI uses Vite + React.
3. FastAPI runs locally.
4. SQLite initializes.
5. Trading 212 credentials configure through GUI.
6. EODHD credentials configure through GUI.
7. Trading 212 works with `Orders - Execute` disabled.
8. No order execution capability exists.
9. No buy/sell capability exists.
10. All holdings synchronize with pagination.
11. Transactions synchronize without duplicates.
12. Orders/history synchronize without duplicates.
13. Received dividends synchronize without duplicates.
14. EODHD enriches owned instruments automatically.
15. Automatic mapping works where possible.
16. Manual mapping persists.
17. Future dividends display separately.
18. Expected dividends never count as received.
19. Allocation is graphically represented.
20. Portfolio value is graphically represented.
21. Dividend history is graphically represented.
22. Future income is graphically represented.
23. CSV import is idempotent.
24. Manual transactions work.
25. Interest is tracked separately.
26. Netherlands tax architecture exists.
27. Tax reports identify year and estimate status.
28. Sync does not freeze UI.
29. Cached navigation is responsive.
30. Large transaction lists remain responsive.
31. Provider failures preserve local data.
32. API is versioned for future mobile.
33. Mobile can later consume the same API without duplicating provider logic.
34. No unnecessary heavyweight infrastructure is required.

## 36. Definition of Done

A feature is complete only when:
- backend exists
- frontend exists
- persistence works where required
- loading state exists
- empty state exists
- error state exists
- security requirements are satisfied
- tests exist
- type checking passes
- lint passes
- app starts successfully

Do not declare a feature complete because its UI renders.
