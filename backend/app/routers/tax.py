from fastapi import APIRouter, Query, Response
from typing import Optional
from app.schemas import NetherlandsTaxResponse, TaxRulesResponse, TaxRuleItem, TaxSummaryResponse
from app.services.tax_engine import tax_calculator_nl, NETHERLANDS_TAX_RULES

router = APIRouter(prefix="/tax", tags=["tax"])


@router.get("/rules", response_model=TaxRulesResponse)
def get_tax_rules():
    """Returns available tax rules and parameters versioned by year."""
    rules_list = []
    for yr, r in sorted(NETHERLANDS_TAX_RULES.items()):
        rules_list.append(
            TaxRuleItem(
                year=yr,
                savings_rate=r["savings_rate"],
                investments_rate=r["investments_rate"],
                tax_free_threshold_single=r["tax_free_threshold_single"],
                tax_free_threshold_partner=r["tax_free_threshold_partner"],
                tax_rate=r["tax_rate"],
                status=r["status"],
            )
        )
    return TaxRulesResponse(
        jurisdiction="Netherlands",
        supported_years=sorted(list(NETHERLANDS_TAX_RULES.keys())),
        rules=rules_list,
    )


@router.get("/netherlands", response_model=NetherlandsTaxResponse)
def get_netherlands_tax(
    year: int = Query(default=2025, ge=2024, le=2030, description="Tax year"),
    has_fiscal_partner: bool = Query(default=False, description="Whether filing with a fiscal partner"),
    investments_override: Optional[float] = Query(default=None, ge=0.0, description="Manual override for investments value"),
    cash_override: Optional[float] = Query(default=None, ge=0.0, description="Manual override for cash/savings value"),
):
    """
    Calculates estimated Box 3 wealth tax for the Netherlands.
    Uses synchronized portfolio data by default, or manual overrides if provided.
    DISCLAIMER: Always presented as an estimate; never an official tax liability.
    """
    # Guard against direct Python function calls where default might be fastapi.params.Query
    has_inv_override = isinstance(investments_override, (int, float))
    has_csh_override = isinstance(cash_override, (int, float))

    if has_inv_override or has_csh_override:
        inv = float(investments_override) if has_inv_override else 0.0
        csh = float(cash_override) if has_csh_override else 0.0
        return tax_calculator_nl.calculate_box3(
            investments_value=inv,
            cash_value=csh,
            tax_year=year,
            has_fiscal_partner=has_fiscal_partner,
        )

    return tax_calculator_nl.calculate_from_portfolio(
        tax_year=year,
        has_fiscal_partner=has_fiscal_partner,
    )


@router.get("/netherlands/export")
def export_netherlands_tax_csv(
    year: int = Query(default=2025, ge=2024, le=2030),
    has_fiscal_partner: bool = Query(default=False),
):
    """Exports a timestamped CSV report of the Box 3 calculation with disclaimer and assumptions."""
    csv_content = tax_calculator_nl.export_csv_report(
        tax_year=year,
        has_fiscal_partner=has_fiscal_partner,
    )
    filename = f"divyield_tax_nl_{year}_{'partner' if has_fiscal_partner else 'single'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/summary", response_model=TaxSummaryResponse)
def get_tax_summary(
    year: int = Query(default=2025, ge=2024, le=2030, description="Tax year"),
    has_fiscal_partner: bool = Query(default=False, description="Whether filing with a fiscal partner"),
):
    """Mobile/contract endpoint returning a clean summary of current wealth tax liability."""
    res = get_netherlands_tax(
        year=year,
        has_fiscal_partner=has_fiscal_partner,
        investments_override=None,
        cash_override=None,
    )
    return TaxSummaryResponse(
        jurisdiction=res["jurisdiction"],
        tax_year=res["tax_year"],
        status=res["status"],
        taxable_assets=res["taxable_assets"],
        tax_free_allowance=res["tax_free_allowance"],
        estimated_tax_liability=res["estimated_tax_liability"],
        withholding_tax_credit=res["withholding_tax_credit"],
        estimated_net_liability=res["estimated_net_liability"],
        is_below_threshold=res["is_below_threshold"],
        currency="EUR",
    )


@router.get("/report", response_model=NetherlandsTaxResponse)
def get_tax_report(
    year: int = Query(default=2025, ge=2024, le=2030, description="Tax year"),
    has_fiscal_partner: bool = Query(default=False, description="Whether filing with a fiscal partner"),
):
    """Detailed tax report endpoint for mobile/desktop."""
    return get_netherlands_tax(
        year=year,
        has_fiscal_partner=has_fiscal_partner,
        investments_override=None,
        cash_override=None,
    )

