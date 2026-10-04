"""Export Router for CSV data exports (transactions, dividends, Yahoo Finance portfolio)."""
import datetime
from fastapi import APIRouter, Response
from app.services.csv_io import transactions_csv, dividends_csv, yahoo_portfolio_csv

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/transactions")
def export_transactions():
    """Download transactions as a CSV file."""
    body = transactions_csv()
    filename = f"divyield_transactions_{datetime.date.today().isoformat()}.csv"
    return Response(
        content=body,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/dividends")
def export_dividends():
    """Download received & expected dividends as a CSV file."""
    body = dividends_csv()
    filename = f"divyield_dividends_{datetime.date.today().isoformat()}.csv"
    return Response(
        content=body,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/yahoo")
def export_yahoo_finance():
    """Download portfolio in Yahoo Finance portfolio import CSV format."""
    body = yahoo_portfolio_csv()
    filename = f"divyield_yahoo_portfolio_{datetime.date.today().isoformat()}.csv"
    return Response(
        content=body,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
