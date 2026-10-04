# DivYield 📈

> **A fast, lightweight, local-first dividend tracker and portfolio planner with a hand-drawn sketch aesthetic.**

DivYield connects to your **Trading 212** account with **strict read-only permissions** and enriches your assets with **EODHD** financial data. It gives you a complete view of your dividend income, sector diversification, forward cashflow projections, and Netherlands Box 3 wealth tax estimates.

---

## Key Features

- **🎨 Hand-Drawn Sketch UI**: Built with a paper-grid theme, organic border radiuses, tape accents, and playful fonts (`Architects Daughter`, `Patrick Hand`).
- **🛡️ Strict Read-Only Security**:
  - Trading 212 execution capability is **strictly forbidden** and locked by code.
  - DivYield cannot buy, sell, modify, or cancel trades.
  - Secrets are never stored in localStorage or plaintext SQLite—credentials use the **OS Keychain** (`keyring`) with local Fernet-encrypted fallback.
- **💶 Native EUR Currency Normalization**:
  - Live FX conversion automatically calculated from Trading 212 account PnL across USD, GBP, and British Pence (GBX).
  - Accurate valuation matching your actual Trading 212 account balance.
- **📅 Visual Dividend Calendar**:
  - Full 31-day visual month grid displaying stock ticker, company name, and payout amount.
  - Interactive day drawer to inspect scheduled and received payouts.
  - 12-month summary matrix and comprehensive records table.
- **📊 Planning & Analytics**:
  - Multi-year compounding simulator with dividend reinvestment (DRIP), annual dividend growth (CAGR), and periodic contributions.
  - Concentration and diversification risk alerts (single holding >15%, sector >25%).
- **🇳🇱 Netherlands Box 3 Wealth Tax Estimator**:
  - Versioned tax rules for 2024, 2025, and 2026.
  - Deemed return calculation for bank savings vs. investments, single vs. fiscal partner allowances, and 15% dividend withholding tax credit offset.
  - One-click CSV export with legal disclaimer.
- **🔄 Unified Sync Pipeline**:
  - One-click read-only sync pulling holdings, filled orders, cash movements, and received dividends.
  - Live progress bar showing active sync stage and percentage.
- **🛠️ Data Tools & Manual Entries**:
  - Uninvested cash interest accrual calculator.
  - Manual holdings and transaction logging for external brokers.
  - CSV export/import and Yahoo Finance portfolio format export.

---

## Architecture & Stack

- **Frontend**: Vite, React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: FastAPI, SQLite (WAL mode), Pydantic v2, HTTPX, `keyring`, `cryptography` (Fernet).
- **APIs**:
  - **Trading 212 Public API (v0)**: Read-only positions, cash balances, orders, and received dividends.
  - **EODHD Financial API**: Dividend history, forward calendar, fundamentals, and ticker search.

---

## Prerequisites

- **Python**: 3.10+ (tested through 3.14 on macOS and Linux)
- **Node.js**: 18.0+
- **npm** or **pnpm** / **yarn**

---

## Quick Start (Local Development)

### 1. Clone the Repository

```bash
git clone git@github.com:sunilsankar/DivYield.git
cd DivYield
```

### 2. Backend Setup

```bash
# Navigate to backend (or stay in root if using symlinked .venv)
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations and verify health
python3 -c "from app.database import init_db; init_db()"

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

The backend API will start at `http://localhost:8000` (interactive Swagger documentation available at `http://localhost:8000/docs`).

### 3. Frontend Setup

In a new terminal:

```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```

The web dashboard will be available at `http://localhost:5173`.

---

## Configuring API Connections

Once the app is running, navigate to **Settings / Connections** in the sidebar.

### Trading 212 API Credentials (Strict Read-Only)

1. Open your Trading 212 app or web dashboard: **Settings > API (Beta)**.
2. Generate an API Key with the following permissions:
   ```text
   Account data              ON
   History                   ON
   History - Dividends       ON
   History - Orders          ON
   History - Transactions    ON
   Metadata                  ON
   Orders - Execute         OFF  <-- MUST BE OFF
   ```
3. Copy the **API Key** and **API Secret** into DivYield.
4. Select your environment (`Live` or `Practice/Demo`).
5. Click **Test Connection** to verify, then **Save Credentials**.
6. Click **Sync Now** in the top navigation bar to ingest your portfolio.

### EODHD API Token (Optional / Recommended)

1. Obtain an API token from [EODHD.com](https://eodhd.com).
2. Enter the token into the **EODHD API Key** field in DivYield Settings.
3. Click **Test Connection** and **Save Token**.
4. DivYield will enrich holdings with company fundamentals, payout frequencies, and forward scheduled dividend dates.

---

## Automated Verification & Testing

DivYield includes automated test suites covering API security, calculations, and read-only invariants.

### Backend Tests (73 tests)

```bash
# From project root with virtual environment activated:
pytest backend/tests
```

Key test coverage:
- `test_trading212_readonly.py`: Proves no order placement, modification, or cancellation methods exist.
- `test_trading212_provider.py`: Validates allowlist enforcement, rate-limit backoff, and pagination.
- `test_fx_and_calendar.py`: Tests live FX derivation and visual calendar company name resolution.
- `test_tax.py`: Verifies Netherlands Box 3 rules across tax years 2024–2026.
- `test_combined_sync.py`: Verifies idempotency and concurrency locks during sync.

### Frontend Tests (14 tests)

```bash
# From frontend/ directory:
npm test -- --run
```

### Production Build

```bash
cd frontend
npm run build
```

---

## Deployment & Production Hosting

### 1. Build Static Frontend

```bash
cd frontend
npm run build
```
This produces optimized production assets in `frontend/dist/`.

### 2. Production Backend Server

Run FastAPI using multiple Uvicorn workers behind a production ASGI runner:

```bash
cd backend
source .venv/bin/activate
gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000
```

### 3. Nginx Reverse Proxy Example

```nginx
server {
    listen 80;
    server_name divyield.local;

    # Frontend static files
    location / {
        root /var/www/DivYield/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Systemd Service (Linux Daemon)

Create `/etc/systemd/system/divyield.service`:

```ini
[Unit]
Description=DivYield Backend Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/DivYield/backend
ExecStart=/path/to/DivYield/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## Project Structure

```text
DivYield/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application entrypoint & middleware
│   │   ├── config.py                  # App configuration & paths
│   │   ├── database.py                # SQLite WAL connection & schema
│   │   ├── credentials.py             # Keyring / Fernet credential manager
│   │   ├── schemas.py                 # Pydantic v2 data models
│   │   ├── providers/
│   │   │   ├── trading212.py          # Strict read-only T212 client
│   │   │   ├── trading212_allowlist.py# Security allowlist & forbidden actions
│   │   │   └── eodhd.py               # EODHD financial client
│   │   ├── services/
│   │   │   ├── trading212_sync.py     # T212 sync, FX derivation & idempotency
│   │   │   ├── eodhd_enrichment.py    # Symbol resolution & dividend enrichment
│   │   │   ├── combined_sync.py       # Orchestrated sync pipeline & progress
│   │   │   ├── tax_engine.py          # Netherlands Box 3 rules & calculator
│   │   │   ├── cash_interest.py       # Uninvested cash interest calculator
│   │   │   ├── manual_entries.py      # Manual holdings & transactions
│   │   │   └── csv_io.py              # CSV import/export utilities
│   │   └── routers/                   # API v1 endpoints
│   │       ├── health.py
│   │       ├── credentials.py
│   │       ├── portfolio.py
│   │       ├── transactions.py
│   │       ├── dividends.py
│   │       ├── sync.py
│   │       ├── eodhd.py
│   │       ├── analytics.py
│   │       ├── tax.py
│   │       ├── data_tools.py
│   │       └── export.py
│   └── tests/                         # 73 automated backend tests
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Main dashboard container & sync coordinator
│   │   ├── components/
│   │   │   ├── layout/                # Navbar & Navigation sidebar
│   │   │   ├── dashboard/             # Stat cards, charts & radar
│   │   │   ├── holdings/              # Holdings table, filters & KPIs
│   │   │   ├── dividends/             # Visual month calendar & list
│   │   │   ├── analytics/             # Compounding simulator & risk alerts
│   │   │   ├── tax/                   # Netherlands Box 3 tax estimator
│   │   │   ├── transactions/          # Activity feed & filters
│   │   │   ├── mappings/              # Ticker mapping manager
│   │   │   ├── data/                  # Interest calculator & CSV tools
│   │   │   └── settings/              # API connections manager
│   │   ├── lib/api.ts                 # Type-safe API client
│   │   └── types/index.ts             # TypeScript interfaces
│   └── tests/                         # Vitest suites
├── docs/                              # Architecture, API & tax specifications
└── data/                              # Local SQLite storage (gitignored)
```

---

## Security & Privacy Notice

DivYield operates locally on your machine.
- Your credentials never leave your local device.
- All tax calculations and projections are computed locally.
- DivYield estimates are for planning purposes and should not be considered official tax or legal advice.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
