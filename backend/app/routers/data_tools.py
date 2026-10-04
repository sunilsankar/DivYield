from typing import List, Optional
from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import Response
from app.schemas import (
    CashInterestRequest,
    CashInterestResponse,
    CashInterestItem,
    CashInterestEstimate,
    ManualHoldingRequest,
    ManualTransactionRequest,
    GenericActionResponse,
)
from app.services.cash_interest import (
    estimate_cash_interest,
    list_cash_interest,
    total_interest_ytd,
)
from app.services.manual_entries import create_manual_holding, create_manual_transaction
from app.database import get_db

router = APIRouter(prefix="/data-tools", tags=["Data Tools"])


@router.post("/cash-interest/estimate", response_model=CashInterestEstimate)
def estimate_cash_interest_endpoint(req: CashInterestRequest):
    """Compute and persist simple interest on a cash balance for a period."""
    try:
        return estimate_cash_interest(
            average_balance=req.average_balance,
            annual_rate_percent=req.annual_rate_percent,
            period_start=req.period_start,
            period_end=req.period_end,
            notes=req.notes,
            source=req.source or "MANUAL",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/cash-interest", response_model=CashInterestResponse)
def list_cash_interest_endpoint(limit: int = Query(default=100, ge=1, le=500)):
    periods = list_cash_interest(limit=limit)
    items = [CashInterestItem(**p) for p in periods]
    return CashInterestResponse(periods=items, total_interest_ytd=total_interest_ytd())


@router.post("/manual-holdings", response_model=GenericActionResponse)
def manual_holding_endpoint(req: ManualHoldingRequest):
    try:
        result = create_manual_holding(
            ticker=req.ticker,
            quantity=req.quantity,
            average_price=req.average_price,
            name=req.name,
            currency=req.currency,
            sector=req.sector,
            annual_dividend=req.annual_dividend,
            dividend_yield=req.dividend_yield,
            payout_frequency=req.payout_frequency,
            external_id=req.external_id,
        )
        return GenericActionResponse(success=True, message=f"Manual holding '{result['ticker']}' saved.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/manual-transactions", response_model=GenericActionResponse)
def manual_transaction_endpoint(req: ManualTransactionRequest):
    try:
        result = create_manual_transaction(
            ticker=req.ticker,
            type_=req.type,
            amount=req.amount,
            currency=req.currency,
            date_=req.date,
            quantity=req.quantity,
            price=req.price,
            notes=req.notes,
            external_id=req.external_id,
        )
        return GenericActionResponse(
            success=True,
            message=f"Manual {result['type']} transaction saved for {result.get('ticker') or 'cash'}",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/export.csv")
def export_csv(
    dataset: str = Query("holdings", pattern="^(holdings|transactions|dividends)$"),
):
    """Exports a CSV for the chosen dataset from the local SQLite database."""
    from app.services.csv_io import holdings_csv, transactions_csv, dividends_csv

    if dataset == "holdings":
        body = holdings_csv()
        filename = "divyield_holdings.csv"
    elif dataset == "transactions":
        body = transactions_csv()
        filename = "divyield_transactions.csv"
    else:
        body = dividends_csv()
        filename = "divyield_dividends.csv"

    return Response(
        content=body,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import.csv")
def import_csv(
    dataset: str = Query("holdings", pattern="^(holdings|transactions|dividends)$"),
    body: str = Body(..., media_type="text/csv"),
):
    """Import a CSV from the request body. Validates headers and returns counts."""
    from app.services.csv_io import import_holdings_csv, import_transactions_csv, import_dividends_csv

    try:
        if dataset == "holdings":
            count = import_holdings_csv(body)
        elif dataset == "transactions":
            count = import_transactions_csv(body)
        elif dataset == "dividends":
            count = import_dividends_csv(body)
        else:
            raise HTTPException(status_code=400, detail="Unsupported dataset")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return GenericActionResponse(success=True, message=f"Imported {count} {dataset} record(s).")