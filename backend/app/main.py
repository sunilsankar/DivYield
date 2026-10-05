import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.database import init_db
from app.routers import health, credentials, portfolio, transactions, dividends, sync, analytics, tax, data_tools, export, mappings, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="DivYield API",
    description="Fast, smooth, lightweight portfolio and dividend tracker API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_v1_prefix)
app.include_router(credentials.router, prefix=settings.api_v1_prefix)
app.include_router(portfolio.router, prefix=settings.api_v1_prefix)
app.include_router(transactions.router, prefix=settings.api_v1_prefix)
app.include_router(dividends.router, prefix=settings.api_v1_prefix)
app.include_router(sync.router, prefix=settings.api_v1_prefix)
app.include_router(analytics.router, prefix=settings.api_v1_prefix)
app.include_router(tax.router, prefix=settings.api_v1_prefix)
app.include_router(data_tools.router, prefix=settings.api_v1_prefix)
app.include_router(export.router, prefix=settings.api_v1_prefix)
app.include_router(mappings.router, prefix=settings.api_v1_prefix)
app.include_router(system.router, prefix=settings.api_v1_prefix)

# Serve React frontend if running in packaged desktop mode or dist exists
frontend_dist = None
if getattr(sys, 'frozen', False):
    # PyInstaller onedir/onefile mode
    candidates = [
        Path(getattr(sys, '_MEIPASS', '')) / "frontend" / "dist",
        Path(sys.executable).parent / "frontend" / "dist",
        Path(sys.executable).parent / "_internal" / "frontend" / "dist",
    ]
    for c in candidates:
        if c.exists() and c.is_dir():
            frontend_dist = c
            break
else:
    base_dir = Path(__file__).resolve().parent.parent.parent
    dev_dist = base_dir / "frontend" / "dist"
    if dev_dist.exists() and dev_dist.is_dir():
        frontend_dist = dev_dist

if frontend_dist and frontend_dist.exists() and frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")
    
    @app.get("/")
    def serve_frontend_root():
        return FileResponse(frontend_dist / "index.html")
    
    # Catch-all for SPA navigation (if React Router was added later)
    @app.get("/{full_path:path}")
    def serve_frontend_catch_all(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        # Check if file actually exists
        possible_file = frontend_dist / full_path
        if possible_file.is_file():
            return FileResponse(possible_file)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {"message": "DivYield API v1 is running", "docs": "/docs"}
