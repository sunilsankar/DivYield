"""Pydantic request and response schemas for DivYield API v1."""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class Trading212CredentialsRequest(BaseModel):
    api_key: str = Field(..., min_length=1, description="Trading 212 API Key")
    api_secret: Optional[str] = Field(None, description="Optional API Secret")
    environment: str = Field("live", pattern="^(live|demo)$", description="Environment ('live' or 'demo')")


class Trading212TestRequest(BaseModel):
    api_key: Optional[str] = Field(None, description="Test with unsaved key")
    api_secret: Optional[str] = Field(None, description="Optional secret")
    environment: Optional[str] = Field("live", pattern="^(live|demo)$")


class Trading212Status(BaseModel):
    configured: bool
    environment: Optional[str] = "live"
    masked_key: Optional[str] = None
    status: str = "disconnected"
    last_checked: Optional[str] = None
    error_message: Optional[str] = None
    account_currency: Optional[str] = None


class ConnectionsResponse(BaseModel):
    trading212: Trading212Status
    eodhd: Optional[Dict[str, Any]] = None


class GenericActionResponse(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# Holdings & Portfolio Schemas
class HoldingItem(BaseModel):
    id: int
    provider: str
    external_id: Optional[str] = None
    ticker: str
    name: str
    isin: Optional[str] = None
    currency: str
    quantity: float
    average_price: float
    current_price: float
    market_value: float
    unrealized_gain: float
    unrealized_gain_percent: float
    updated_at: Optional[str] = None


class HoldingsResponse(BaseModel):
    holdings: List[HoldingItem]
    count: int
    total_market_value: float
    currency: str


class PortfolioSummaryResponse(BaseModel):
    total_value: float
    holdings_value: float
    total_invested: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    free_cash: float
    total_cash: float
    currency: str
    holdings_count: int
    last_synced: Optional[str] = None


# Transactions Schemas
class TransactionItem(BaseModel):
    id: int
    date: str
    ticker: str
    type: str
    quantity: float
    price: float
    amount: float
    fees: float
    currency: str
    external_id: Optional[str] = None
    source: str
    notes: Optional[str] = None
    synced_at: Optional[str] = None


class TransactionsResponse(BaseModel):
    transactions: List[TransactionItem]
    total_count: int
    limit: int
    offset: int


# Dividends Schemas
class DividendItem(BaseModel):
    id: int
    ticker: str
    company_name: Optional[str] = None
    declaration_date: Optional[str] = None
    ex_dividend_date: Optional[str] = None
    record_date: Optional[str] = None
    payment_date: Optional[str] = None
    amount: float
    currency: str
    source: str
    status: str
    external_id: Optional[str] = None
    updated_at: Optional[str] = None


class DividendsResponse(BaseModel):
    dividends: List[DividendItem]
    total_amount: float
    currency: str
    count: int


# Sync Schemas
class SyncResponse(BaseModel):
    success: bool
    status: str
    message: str
    holdings_count: Optional[int] = 0
    orders_count: Optional[int] = 0
    transactions_count: Optional[int] = 0
    dividends_count: Optional[int] = 0
    instruments_enriched: Optional[int] = 0
    expected_dividends_added: Optional[int] = 0
    account_currency: Optional[str] = "EUR"
    free_cash: Optional[float] = 0.0
    total_cash: Optional[float] = 0.0
    last_synced: Optional[str] = None
    eodhd_status: Optional[str] = None
    error: Optional[str] = None


class SyncStatusResponse(BaseModel):
    is_syncing: bool
    last_synced: Optional[str] = None
    trading212_status: str
    trading212_error: Optional[str] = None
    eodhd_status: Optional[str] = None
    eodhd_last_enriched: Optional[str] = None
    eodhd_error: Optional[str] = None
    current_step: int = 0
    total_steps: int = 0
    step_message: Optional[str] = None


class ConcentrationItem(BaseModel):
    name: str
    ticker: str
    value: float
    percentage: float
    warning: bool = False


class SectorConcentrationItem(BaseModel):
    sector: str
    value: float
    percentage: float
    count: int
    warning: bool = False


class FrequencyItem(BaseModel):
    frequency: str
    count: int
    annual_amount: float
    percentage: float


class IncomeByHoldingItem(BaseModel):
    ticker: str
    name: str
    annual_dividend: float
    yield_percent: float
    percentage_of_total_income: float


class AnalyticsOverviewResponse(BaseModel):
    total_portfolio_value: float
    total_invested: float
    total_unrealized_pnl: float
    total_unrealized_pnl_percent: float
    total_annual_dividend: float
    portfolio_yield: float
    yield_on_cost: float
    top1_concentration: float
    top3_concentration: float
    top5_concentration: float
    single_stock_warnings: List[str] = []
    sector_warnings: List[str] = []
    holdings_concentration: List[ConcentrationItem] = []
    sector_breakdown: List[SectorConcentrationItem] = []
    frequency_breakdown: List[FrequencyItem] = []
    income_by_holding: List[IncomeByHoldingItem] = []


class ProjectionYearItem(BaseModel):
    year: int
    portfolio_value: float
    annual_dividend: float
    monthly_dividend: float
    cumulative_dividends: float
    yield_on_cost: float


class ProjectionsResponse(BaseModel):
    initial_value: float
    initial_annual_dividend: float
    dividend_growth_rate: float
    dividend_reinvestment: bool
    annual_contribution: float
    years: int
    projections: List[ProjectionYearItem]


class HistoricalAnnualGrowthItem(BaseModel):
    year: int
    received_amount: float
    growth_rate_percent: Optional[float] = None


class DividendGrowthResponse(BaseModel):
    years: List[HistoricalAnnualGrowthItem]
    cagr_percent: Optional[float] = None


class NetherlandsTaxResponse(BaseModel):
    jurisdiction: str
    tax_year: int
    status: str
    source_data_date: str
    assumptions: List[str]
    total_assets: float
    total_investments: float
    total_cash: float
    tax_free_allowance: float
    taxable_assets: float
    deemed_return_investments: float
    deemed_return_cash: float
    total_deemed_return: float
    effective_return_rate: float
    taxable_benefit: float
    tax_rate: float
    estimated_tax_liability: float
    withholding_tax_credit: float
    estimated_net_liability: float
    is_below_threshold: bool
    total_dividends_received: Optional[float] = 0.0


class TaxRuleItem(BaseModel):
    year: int
    savings_rate: float
    investments_rate: float
    tax_free_threshold_single: float
    tax_free_threshold_partner: float
    tax_rate: float
    status: str


class TaxRulesResponse(BaseModel):
    jurisdiction: str
    supported_years: List[int]
    rules: List[TaxRuleItem]


class CashInterestRequest(BaseModel):
    average_balance: float
    annual_rate_percent: float
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = "MANUAL"


class CashInterestItem(BaseModel):
    id: int
    source: str
    period_start: str
    period_end: str
    average_balance: float
    annual_rate: float
    interest_earned: float
    notes: Optional[str] = None
    created_at: Optional[str] = None


class CashInterestResponse(BaseModel):
    periods: List[CashInterestItem]
    total_interest_ytd: float


class CashInterestEstimate(BaseModel):
    source: str
    period_start: str
    period_end: str
    days: int
    average_balance: float
    annual_rate: float
    interest_earned: float
    daily_accrual: float


class ManualHoldingRequest(BaseModel):
    ticker: str
    quantity: float
    average_price: float
    name: Optional[str] = None
    currency: str = "EUR"
    sector: Optional[str] = None
    annual_dividend: float = 0.0
    dividend_yield: float = 0.0
    payout_frequency: Optional[str] = None
    external_id: Optional[str] = None


class ManualTransactionRequest(BaseModel):
    ticker: Optional[str] = None
    type: str
    amount: float
    currency: str = "EUR"
    date: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    notes: Optional[str] = None
    external_id: Optional[str] = None


class CalendarItem(BaseModel):
    id: Optional[int] = None
    ticker: str
    company_name: Optional[str] = None
    date: Optional[str] = None
    ex_date: Optional[str] = None
    payment_date: Optional[str] = None
    amount: float
    currency: str = "EUR"
    status: str  # RECEIVED | EXPECTED
    source: str
    updated_at: Optional[str] = None


class CalendarResponse(BaseModel):
    events: List[CalendarItem]
    total_received: float
    total_expected: float
    total_amount: float
    currency: str
    count: int


class AnalyticsAllocationResponse(BaseModel):
    total_value: float
    currency: str
    sectors: List[SectorConcentrationItem]
    top_holdings: List[ConcentrationItem]
    single_stock_warnings: List[str] = []
    sector_warnings: List[str] = []


class AnalyticsDividendsResponse(BaseModel):
    annual_dividend_income: float
    current_portfolio_yield: float
    yield_on_cost: float
    currency: str
    frequency_breakdown: List[FrequencyItem]
    income_by_holding: List[IncomeByHoldingItem]


class AnalyticsValueResponse(BaseModel):
    total_portfolio_value: float
    holdings_value: float
    uninvested_cash: float
    total_invested: float
    unrealized_pnl: float
    pnl_percent: float
    holdings_count: int
    currency: str


class TaxSummaryResponse(BaseModel):
    jurisdiction: str
    tax_year: int
    status: str
    taxable_assets: float
    tax_free_allowance: float
    estimated_tax_liability: float
    withholding_tax_credit: float
    estimated_net_liability: float
    is_below_threshold: bool
    currency: str = "EUR"


class InstrumentMappingItem(BaseModel):
    id: int
    trading212_ticker: str
    yahoo_ticker: str
    confidence: str = "AUTO"
    updated_at: Optional[str] = None


class CreateMappingRequest(BaseModel):
    trading212_ticker: str
    yahoo_ticker: str


class MappingsResponse(BaseModel):
    mappings: List[InstrumentMappingItem]
    count: int




