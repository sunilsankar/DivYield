"""EODHD Market Data and Instrument Mapping Router."""
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.database import get_db_connection
from app.credentials import get_eodhd_credentials
from app.providers.eodhd import EODHDClient
from app.services.eodhd_enrichment import EODHDEnrichmentService
from app.schemas import (
    EnrichmentResponse,
    InstrumentMappingItem,
    CreateMappingRequest,
    MappingsResponse,
    SymbolSearchResult,
    GenericActionResponse,
)

router = APIRouter(tags=["eodhd"])


@router.post("/eodhd/enrich", response_model=EnrichmentResponse)
async def enrich_portfolio_eodhd():
    """Trigger EODHD enrichment for all owned holdings."""
    creds = get_eodhd_credentials()
    if not creds or not creds.get("api_token"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="EODHD is not configured. Please add an API token in Settings.",
        )

    service = EODHDEnrichmentService()
    result = await service.enrich_portfolio()
    return EnrichmentResponse(**result)


@router.get("/eodhd/search", response_model=List[SymbolSearchResult])
async def search_eodhd_symbols(q: str = Query(..., min_length=1, description="Ticker or company name to search")):
    """Search for instruments on EODHD."""
    creds = get_eodhd_credentials()
    if not creds or not creds.get("api_token"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="EODHD is not configured. Please add an API token in Settings.",
        )

    client = EODHDClient(api_token=creds["api_token"])
    results = await client.search_symbols(q)
    formatted = []
    for r in results:
        formatted.append(
            SymbolSearchResult(
                code=r.get("Code", ""),
                exchange=r.get("Exchange", ""),
                name=r.get("Name", ""),
                type=r.get("Type"),
                country=r.get("Country"),
                currency=r.get("Currency"),
                isin=r.get("ISIN"),
            )
        )
    return formatted


@router.get("/mappings", response_model=MappingsResponse)
def list_instrument_mappings():
    """Retrieve all stored Trading 212 -> EODHD symbol mappings."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, trading212_identifier, trading212_ticker, eodhd_symbol,
                   confidence, created_at, updated_at
            FROM instrument_mappings
            ORDER BY trading212_identifier ASC
            """
        )
        rows = cursor.fetchall()
        items = [
            InstrumentMappingItem(
                id=row["id"],
                trading212_identifier=row["trading212_identifier"],
                trading212_ticker=row["trading212_ticker"],
                eodhd_symbol=row["eodhd_symbol"],
                confidence=row["confidence"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]
        return MappingsResponse(mappings=items, count=len(items))


@router.post("/mappings", response_model=GenericActionResponse)
def create_or_update_mapping(req: CreateMappingRequest):
    """Create or manually override an instrument mapping."""
    clean_id = req.trading212_identifier.strip().upper()
    clean_symbol = req.eodhd_symbol.strip().upper()

    if not clean_id or not clean_symbol:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trading 212 identifier and EODHD symbol cannot be blank.",
        )

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO instrument_mappings
            (trading212_identifier, trading212_ticker, eodhd_symbol, confidence, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(trading212_identifier) DO UPDATE SET
                eodhd_symbol = excluded.eodhd_symbol,
                confidence = excluded.confidence,
                updated_at = CURRENT_TIMESTAMP
            """,
            (clean_id, clean_id, clean_symbol, req.confidence or "MANUAL"),
        )
        conn.commit()

    return GenericActionResponse(
        success=True,
        message=f"Mapped '{clean_id}' to EODHD symbol '{clean_symbol}'",
    )


@router.delete("/mappings/{mapping_id}", response_model=GenericActionResponse)
def delete_mapping(mapping_id: int):
    """Remove an instrument mapping by ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM instrument_mappings WHERE id = ?", (mapping_id,))
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mapping ID {mapping_id} not found",
            )
        conn.commit()

    return GenericActionResponse(
        success=True,
        message=f"Deleted instrument mapping #{mapping_id}",
    )
