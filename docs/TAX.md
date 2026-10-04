# DivYield Tax Module

Trading 212 supplies source portfolio and transaction data.

DivYield calculates estimates locally.

EODHD is not the tax authority and does not determine tax rules.

## Initial jurisdiction

Netherlands.

## Architecture

```text
TaxEngine
└── NetherlandsTaxCalculator
```

Tax rules are versioned by tax year.

Reports must state:
- jurisdiction
- tax year
- calculation status
- source-data date
- assumptions

Example:

```text
Jurisdiction: Netherlands
Tax year: 2026
Status: Estimate
```

Never present an application estimate as an official tax liability.
