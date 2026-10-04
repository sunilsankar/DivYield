# OpenCode Handoff — DivYield

Read:
1. `AGENTS.md`
2. `docs/SPECIFICATION.md`
3. `docs/DEVELOPMENT.md`

Do not implement the entire product in one pass.

## First milestone

Scaffold a working empty DivYield application:

- Vite React TypeScript frontend
- Tailwind
- shadcn/ui foundation
- FastAPI backend
- SQLite initialization
- `/api/v1/health`
- frontend-to-backend connectivity
- basic sidebar/app shell

Run tests and verify startup before continuing.

## Highest-risk requirement

Trading 212 must remain strictly read-only.

Required key configuration:

```text
Account data              ON
History                   ON
History - Dividends       ON
History - Orders          ON
History - Transactions    ON
Metadata                  ON
Orders - Execute         OFF
```

Before implementing the provider, create tests proving:
- execution permission is not required
- no mutation method exists
- no buy/sell route exists

## Primary product workflow

```text
GUI credentials
→ Test Trading 212
→ Test EODHD
→ Save
→ Sync Now
→ All Trading 212 holdings
→ Automatic mapping
→ EODHD dividends
→ Future dividend calendar
→ Dashboard
```

The user should not manually enter tickers for normal operation.

## UX priority

DivYield must feel:
- fast
- smooth
- clean
- graphical
- lightweight

Overview must contain a graphical portfolio allocation donut/pie.

## Stop conditions

Ask for clarification only if a required provider API contract is genuinely ambiguous, an implementation would violate read-only security, or a requested feature conflicts with the specification.
