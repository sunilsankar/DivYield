# -*- mode: python ; coding: utf-8 -*-
import os
import sys

block_cipher = None

# Detect platform icon if available
icon_file = None
if sys.platform == 'darwin' and os.path.exists('assets/icon.icns'):
    icon_file = os.path.abspath('assets/icon.icns')
elif sys.platform.startswith('win') and os.path.exists('assets/icon.ico'):
    icon_file = os.path.abspath('assets/icon.ico')

a = Analysis(
    ['desktop.py'],
    pathex=['.', 'backend'],
    binaries=[],
    datas=[
        ('frontend/dist', 'frontend/dist'),
        ('assets', 'assets'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'app.main',
        'app.config',
        'app.database',
        'app.credentials',
        'app.schemas',
        'app.routers.health',
        'app.routers.credentials',
        'app.routers.portfolio',
        'app.routers.transactions',
        'app.routers.dividends',
        'app.routers.sync',
        'app.routers.mappings',
        'app.routers.analytics',
        'app.routers.tax',
        'app.routers.data_tools',
        'app.routers.export',
        'app.services.combined_sync',
        'app.services.trading212_sync',
        'app.services.yfinance_enrichment',
        'app.services.tax_engine',
        'app.services.cash_interest',
        'app.services.manual_entries',
        'app.services.csv_io',
        'app.providers.trading212',
        'app.providers.trading212_allowlist',
        'yfinance',
        'sqlite3',
        'keyring.backends.macOS',
        'keyring.backends.Windows',
        'keyring.backends.SecretService',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='DivYield',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_file,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='DivYield',
)

if sys.platform == 'darwin':
    app = BUNDLE(
        coll,
        name='DivYield.app',
        icon=icon_file,
        bundle_identifier='com.divyield.app',
    )
