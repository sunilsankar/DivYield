# DivYield Installation & Deployment Guide

This document provides complete instructions for installing, configuring, and deploying DivYield across different environments:
1. [Prerequisites & System Requirements](#prerequisites--system-requirements)
2. [Local Development Setup](#local-development-setup)
3. [Building Standalone Desktop Applications (macOS DMG & Windows EXE)](#building-standalone-desktop-applications)
4. [Production Server Deployment (Linux, Nginx & Systemd)](#production-server-deployment)
5. [Connecting Broker & Market APIs](#connecting-broker--market-apis)
6. [Security & Data Storage Architecture](#security--data-storage-architecture)
7. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Pre-Compiled Desktop Installers (Recommended)

If you just want to run DivYield without compiling from source, download the pre-compiled installer for your operating system from the latest [GitHub Releases](https://github.com/sunilsankar/DivYield/releases):

| Platform | Recommended Installer | Details |
|---|---|---|
| **Windows 10 / 11** | `DivYield-Windows.msi` | Native Windows Installer. Installs to Program Files with Start Menu shortcut and uninstaller. *(Portable `DivYield-Windows.zip` also available)* |
| **macOS (Apple Silicon)** | `DivYield-macOS-AppleSilicon.dmg` | Native ARM64 disk image for Apple Silicon (M1, M2, M3, M4) Macs. Drag to Applications. |
| **macOS (Intel)** | `DivYield-macOS-Intel.dmg` | Native x86_64 disk image for Intel Core-based Macs. Drag to Applications. |

---

## Prerequisites & System Requirements

### Hardware Requirements
- **Memory**: Minimum 2 GB RAM (4 GB recommended)
- **Disk Space**: ~500 MB for source code, dependencies, and build artifacts
- **Architecture**: x86_64 or ARM64 (Apple Silicon M1/M2/M3/M4 supported natively)

### Supported Operating Systems
- **macOS**: 11.0 (Big Sur) or newer
- **Windows**: Windows 10, Windows 11 (64-bit)
- **Linux**: Ubuntu 20.04+, Debian 11+, Fedora 36+, Arch Linux

### Software Dependencies
- **Python**: Version 3.10 to 3.14
- **Node.js**: Version 18.0 or newer
- **npm** (bundled with Node.js) or **pnpm**
- **Git**

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone git@github.com:sunilsankar/DivYield.git
cd DivYield
```

### 2. Backend Environment & Dependencies

From the repository root:

```bash
# Navigate to backend directory
cd backend

# Create a virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows PowerShell:
# .venv\Scripts\Activate.ps1
# On Windows Command Prompt:
# .venv\Scripts\activate.bat

# Upgrade pip and install requirements
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Initialize SQLite Database

Initialize the database schema with WAL (Write-Ahead Logging) mode and composite query indices:

```bash
python3 -c "from app.database import init_db; init_db()"
```
This generates the SQLite database at `data/divyield.db` (gitignored).

### 4. Start the FastAPI Development Server

```bash
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive OpenAPI / Swagger Docs: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

### 5. Frontend Setup

In a separate terminal window:

```bash
cd frontend

# Install JavaScript dependencies
npm install

# Start Vite hot-reloading development server
npm run dev
```

The web dashboard is now live at **`http://localhost:5173`**.

### 6. Run Test Verification Suites

Make sure all automated test suites pass:

```bash
# Run 73 backend unit and security tests (from project root with venv active)
pytest backend/tests

# Run 14 frontend unit tests (from frontend directory)
cd frontend
npm test -- --run

# Run TypeScript typecheck & production build check
npm run build
```

---

## Building Standalone Desktop Applications

DivYield can be packaged as a single native desktop executable using **`pywebview`** and **PyInstaller**. The executable runs the backend server invisibly in a daemon thread on a random available port, serves the React static files, and launches a native window without browser address bars.

### 1. Build the React Frontend

PyInstaller bundles the compiled React application. You must build the frontend first:

```bash
cd frontend
npm run build
cd ..
```
This writes the production distribution to `frontend/dist/`.

### 2. Install Desktop Packaging Dependencies

Ensure your virtual environment is active:

```bash
pip install pyinstaller pywebview
```

### 3. Build Standalone Binary

Run PyInstaller using the provided `DivYield.spec` configuration:

```bash
pyinstaller DivYield.spec --clean
```

### 4. Output Artifacts

- **macOS (`dist/DivYield.app`)**:
  - Standalone macOS Application Bundle.
  - To package into a distributable DMG on macOS:
    ```bash
    hdiutil create -volname "DivYield" -srcfolder "dist/DivYield.app" -ov -format UDZO "DivYield-macOS.dmg"
    ```
- **Windows (`dist/DivYield/DivYield.exe`)**:
  - Standalone Windows application directory containing `DivYield.exe`.
  - Can be built into a native `DivYield-Windows.msi` installer using the included WiX configuration:
    ```powershell
    # 1. Harvest files from PyInstaller dist
    heat dir "dist\DivYield" -cg DivYieldComponents -dr INSTALLFOLDER -scom -sreg -srd -var var.SourceDir -gg -out "dist\HarvestedComponents.wxs"
    # 2. Compile WiX sources
    candle -dSourceDir="dist\DivYield" -out "dist\" wix\Product.wxs dist\HarvestedComponents.wxs
    # 3. Link MSI installer with standard UI
    light -ext WixUIExtension -sice:ICE69 -sice:ICE91 -out "DivYield-Windows.msi" dist\Product.wixobj dist\HarvestedComponents.wixobj
    ```

### How the Desktop App Operates
- It imports `desktop.py`.
- It finds an available ephemeral port using OS socket binding (`port=0`), avoiding conflicts with existing services.
- It launches FastAPI in a background daemon thread with `uvicorn.Server`.
- It mounts `frontend/dist` at the root path `/`.
- It redirects database storage and encrypted secret keys to the user's OS application directory:
  - macOS: `~/Library/Application Support/DivYield/`
  - Windows: `%APPDATA%\DivYield\`
  - Linux: `~/.local/share/DivYield/`
- It opens an 800×1200 native window with Apple HIG or Windows modern styling.

---

## Production Server Deployment

To deploy DivYield as a self-hosted web service on a Linux server:

### 1. Build Static Web Assets

```bash
cd frontend
npm install
npm run build
```

### 2. Set Up Python Production Environment

```bash
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt gunicorn
python3 -c "from app.database import init_db; init_db()"
```

### 3. Systemd Service Unit

Create `/etc/systemd/system/divyield.service`:

```ini
[Unit]
Description=DivYield Portfolio & Dividend Backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/DivYield/backend
Environment="PATH=/var/www/DivYield/backend/.venv/bin"
ExecStart=/var/www/DivYield/backend/.venv/bin/gunicorn app.main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/divyield/access.log \
    --error-logfile /var/log/divyield/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo mkdir -p /var/log/divyield
sudo chown -R www-data:www-data /var/log/divyield
sudo systemctl daemon-reload
sudo systemctl enable divyield
sudo systemctl start divyield
```

### 4. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/divyield.conf`:

```nginx
server {
    listen 80;
    server_name divyield.yourdomain.com;

    # Static React frontend
    location / {
        root /var/www/DivYield/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API endpoints routed to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Documentation (optional, can be restricted by IP)
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```

Enable the configuration and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/divyield.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Connecting Broker & Market APIs

After opening DivYield, click **Settings > API Connections** in the sidebar:

### 1. Trading 212 API Credentials (Strict Read-Only)

1. Open your Trading 212 mobile app or web platform: **Settings > API (Beta)**.
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
   *Note: DivYield's security layer strictly rejects order execution and trade manipulation.*
3. Copy your **API Key** and **API Secret** into the DivYield connection form.
4. Choose **Live** or **Practice/Demo** environment.
5. Click **Test Connection** to verify access, then **Save Credentials**.

### 2. EODHD Market API Token (Optional / Recommended)

1. Sign up for an API token at [EODHD.com](https://eodhd.com).
2. Enter your token into the **EODHD API Key** field.
3. Click **Test Connection** and **Save Token**.
4. DivYield will enrich holdings with company fundamentals, dividend schedules, and sector classifications.

---

## Security & Data Storage Architecture

- **Zero Plaintext Credentials**: API keys and tokens are stored in the host OS Keychain using `keyring` (macOS Keychain, Windows Credential Manager, Linux SecretService). If no keychain daemon is available, secrets fall back to local Fernet encryption (`data/.secrets.enc` with file permission `0600`).
- **Strict Read-Only Enforcement**: DivYield code contains an explicit allowlist of permissible Trading 212 endpoints. Any request containing trading verbs (`order`, `buy`, `sell`, `cancel`, `transfer`) is blocked by both software rules and automated security tests.
- **Local SQLite Database**: All portfolio holdings, transactions, and dividend records are stored locally in `data/divyield.db`. No financial data is sent to external servers other than direct read queries to Trading 212 and EODHD.

---

## Troubleshooting & FAQ

### 1. "No module named 'app'"
Run uvicorn from the `backend/` directory or pass the `--app-dir` argument:
```bash
# Either:
cd backend && uvicorn app.main:app --reload
# Or from root:
uvicorn app.main:app --app-dir backend --reload
```

### 2. Trading 212 Connection Test Returns "invalid_credentials"
- Verify whether your key is for the **Live** or **Practice/Demo** environment and toggle the environment selector accordingly.
- Ensure both **API Key** and **API Secret** are entered correctly (Trading 212 API v0 uses HTTP Basic Authentication).
- Confirm the IP address running DivYield is permitted if you set IP whitelisting in Trading 212.

### 3. Port Already in Use (Web Dev)
If port 8000 is occupied, run FastAPI on another port:
```bash
uvicorn app.main:app --port 8001
```
Then configure the frontend proxy in `frontend/vite.config.ts` or set `VITE_API_URL=http://localhost:8001`.
*(The desktop application automatically finds an unused port).*

---

## License

DivYield is licensed under the **Apache License, Version 2.0**. See the [LICENSE](../LICENSE) file for terms and conditions.
