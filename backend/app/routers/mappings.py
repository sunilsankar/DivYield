"""Ticker Mappings & Yahoo Finance Enrichment Router."""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.database import get_db
from app.schemas import (
    MappingsResponse,
    InstrumentMappingItem,
    CreateMappingRequest,
    GenericActionResponse,
)
from app.services.yfinance_enrichment import YahooFinanceEnrichmentService, resolve_yahoo_symbol

router = APIRouter(tags=["mappings"])


@router.get("/mappings", response_model=MappingsResponse)
def get_mappings():
    """List all saved instrument ticker mappings."""
    items = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, trading212_ticker, yahoo_ticker, confidence, updated_at
            FROM instrument_mappings
            ORDER BY trading212_ticker ASC;
            """
        )
        for r in cursor.fetchall():
            items.append(
                InstrumentMappingItem(
                    id=r["id"],
                    trading212_ticker=r["trading212_ticker"],
                    yahoo_ticker=r["yahoo_ticker"],
                    confidence=r["confidence"] or "AUTO",
                    updated_at=r["updated_at"],
                )
            )

    return MappingsResponse(mappings=items, count=len(items))


@router.post("/mappings", response_model=GenericActionResponse)
def create_or_update_mapping(req: CreateMappingRequest):
    """Create or update a custom Yahoo Finance ticker mapping."""
    t212_ticker = req.trading212_ticker.strip().upper()
    yahoo_ticker = req.yahoo_ticker.strip().upper()

    if not t212_ticker or not yahoo_ticker:
        raise HTTPException(status_code=400, detail="Both trading212_ticker and yahoo_ticker are required.")

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO instrument_mappings (trading212_ticker, yahoo_ticker, confidence, updated_at)
            VALUES (?, ?, 'MANUAL', CURRENT_TIMESTAMP)
            ON CONFLICT(trading212_ticker) DO UPDATE SET
                yahoo_ticker = excluded.yahoo_ticker,
                confidence = 'MANUAL',
                updated_at = CURRENT_TIMESTAMP;
            """,
            (t212_ticker, yahoo_ticker),
        )
        conn.commit()

    return GenericActionResponse(
        success=True,
        message=f"Mapped {t212_ticker} to {yahoo_ticker} (MANUAL)",
    )


@router.delete("/mappings/{mapping_id}", response_model=GenericActionResponse)
def delete_mapping(mapping_id: int):
    """Delete a custom ticker mapping."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM instrument_mappings WHERE id = ?;", (mapping_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Mapping not found.")
        conn.commit()

    return GenericActionResponse(success=True, message=f"Mapping {mapping_id} deleted successfully.")


@router.post("/enrich", response_model=GenericActionResponse)
async def trigger_enrichment():
    """Manually trigger Yahoo Finance enrichment and future dividend projection."""
    res = await YahooFinanceEnrichmentService.enrich_portfolio(max_workers=4)
    return GenericActionResponse(
        success=True,
        message=f"Enriched {res.get('enriched_count', 0)} holdings and projected {res.get('projected_events', 0)} upcoming dividends.",
    )
