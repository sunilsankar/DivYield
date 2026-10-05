from fastapi import APIRouter, HTTPException
from app.database import reset_database
from app.credentials import delete_trading212_credentials
from app.schemas import GenericActionResponse, ResetDatabaseRequest

router = APIRouter(prefix="/system", tags=["System"])


@router.post("/factory-reset", response_model=GenericActionResponse)
def factory_reset(req: ResetDatabaseRequest = ResetDatabaseRequest(clear_credentials=True)) -> GenericActionResponse:
    """
    Clears all portfolio data, transactions, dividend events, interest records,
    logs, and restored default settings. Optionally deletes Trading 212 API credentials.
    """
    try:
        reset_database()
        if req.clear_credentials:
            delete_trading212_credentials()
            message = "All database records and API credentials have been completely wiped."
        else:
            message = "Database records have been completely wiped. API credentials were preserved."
            
        return GenericActionResponse(
            success=True,
            message=message,
            details={"credentials_cleared": req.clear_credentials},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to reset system: {str(exc)}")
