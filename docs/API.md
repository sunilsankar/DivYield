# DivYield API v1

Base path: `/api/v1`

## Health
`GET /api/v1/health`

## Connections
`GET /api/v1/connections`

Only masked status is returned.

## Credentials

Trading 212:
- `POST /api/v1/credentials/trading212`
- `POST /api/v1/credentials/trading212/test`
- `DELETE /api/v1/credentials/trading212`

EODHD:
- `POST /api/v1/credentials/eodhd`
- `POST /api/v1/credentials/eodhd/test`
- `DELETE /api/v1/credentials/eodhd`

Raw credentials are never returned.

## Sync
`POST /api/v1/sync`

## Portfolio
- `GET /api/v1/portfolio`
- `GET /api/v1/holdings`

## Transactions
- `GET /api/v1/transactions`

## Dividends
- `GET /api/v1/dividends`
- `GET /api/v1/dividends/expected`

## Calendar
- `GET /api/v1/calendar`

## Mappings
- `GET /api/v1/mappings`
- `POST /api/v1/mappings`
- `DELETE /api/v1/mappings/{id}`

## Analytics
- `GET /api/v1/analytics/allocation`
- `GET /api/v1/analytics/dividends`
- `GET /api/v1/analytics/value`

## Tax
- `GET /api/v1/tax/summary`
- `GET /api/v1/tax/report`

## Export
- `GET /api/v1/export/transactions`
- `GET /api/v1/export/dividends`
- `GET /api/v1/export/yahoo`

There must be no Trading 212 order execution route.
