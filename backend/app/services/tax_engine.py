import csv
import io
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.database import get_db, get_setting

# Netherlands Box 3 Tax Rules by year
# References: Belastingdienst Box 3 (Overig vermogen vs Banktegoeden, Heffingsvrij vermogen, Tarief)
NETHERLANDS_TAX_RULES: Dict[int, Dict[str, Any]] = {
    2024: {
        "savings_rate": 1.03,            # 1.03% provisional return on savings/cash
        "investments_rate": 6.04,        # 6.04% deemed return on investments (stocks/ETFs)
        "tax_free_threshold_single": 57000.0,
        "tax_free_threshold_partner": 114000.0,
        "tax_rate": 36.0,               # 36% Box 3 tax rate
        "status": "Final",
    },
    2025: {
        "savings_rate": 1.44,            # 1.44% provisional return on savings/cash
        "investments_rate": 5.88,        # 5.88% deemed return on investments
        "tax_free_threshold_single": 57684.0,
        "tax_free_threshold_partner": 115368.0,
        "tax_rate": 36.0,               # 36% Box 3 tax rate
        "status": "Provisional",
    },
    2026: {
        "savings_rate": 1.50,            # 1.50% provisional estimate
        "investments_rate": 5.95,        # 5.95% estimated deemed return
        "tax_free_threshold_single": 57684.0,
        "tax_free_threshold_partner": 115368.0,
        "tax_rate": 36.0,               # 36% Box 3 tax rate
        "status": "Estimate",
    },
}


class TaxCalculator:
    """Base abstract tax calculator."""
    jurisdiction: str = "Generic"

    def calculate(self, *args, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError


class NetherlandsTaxCalculator(TaxCalculator):
    """
    Implements Box 3 (Savings & Investments) wealth tax calculations for the Netherlands.
    Rules are versioned by tax year and strictly outputted as estimates.
    """
    jurisdiction: str = "Netherlands"

    def get_rules_for_year(self, year: int) -> Dict[str, Any]:
        if year in NETHERLANDS_TAX_RULES:
            return NETHERLANDS_TAX_RULES[year]
        # Fallback to latest year
        return NETHERLANDS_TAX_RULES[2026]

    def calculate_box3(
        self,
        investments_value: float,
        cash_value: float,
        tax_year: int = 2026,
        has_fiscal_partner: bool = False,
    ) -> Dict[str, Any]:
        rules = self.get_rules_for_year(tax_year)
        total_assets = investments_value + cash_value
        allowance = (
            rules["tax_free_threshold_partner"]
            if has_fiscal_partner
            else rules["tax_free_threshold_single"]
        )

        assumptions = [
            f"Box 3 system applies based on tax year {tax_year} rates ({rules['status']}).",
            f"Tax-free wealth allowance: €{allowance:,.2f} ({'fiscal partner' if has_fiscal_partner else 'single filer'}).",
            f"Deemed return on investments (stocks/ETFs): {rules['investments_rate']}%.",
            f"Deemed return on bank deposits/cash: {rules['savings_rate']}%.",
            f"Box 3 tax rate: {rules['tax_rate']}%.",
            "Reference date value is measured on 1 January of the tax year.",
            "Estimates are calculated locally from synchronized source data. Never present as an official tax liability.",
        ]

        if total_assets <= allowance:
            return {
                "jurisdiction": self.jurisdiction,
                "tax_year": tax_year,
                "status": "Estimate",
                "source_data_date": datetime.now().strftime("%Y-%m-%d"),
                "assumptions": assumptions,
                "total_assets": round(total_assets, 2),
                "total_investments": round(investments_value, 2),
                "total_cash": round(cash_value, 2),
                "tax_free_allowance": round(allowance, 2),
                "taxable_assets": 0.0,
                "deemed_return_investments": 0.0,
                "deemed_return_cash": 0.0,
                "total_deemed_return": 0.0,
                "effective_return_rate": 0.0,
                "taxable_benefit": 0.0,
                "tax_rate": rules["tax_rate"],
                "estimated_tax_liability": 0.0,
                "withholding_tax_credit": 0.0,
                "estimated_net_liability": 0.0,
                "is_below_threshold": True,
            }

        # Calculate deemed returns
        deemed_inv = investments_value * (rules["investments_rate"] / 100.0)
        deemed_cash = cash_value * (rules["savings_rate"] / 100.0)
        total_deemed = deemed_inv + deemed_cash

        # Effective deemed return percentage across total portfolio
        effective_rate = (total_deemed / total_assets) if total_assets > 0 else 0.0

        # Taxable wealth portion (grondslag sparen en beleggen)
        taxable_wealth = total_assets - allowance

        # Taxable benefit (voordeel uit sparen en beleggen)
        taxable_benefit = taxable_wealth * effective_rate

        # Box 3 Tax liability
        estimated_tax = taxable_benefit * (rules["tax_rate"] / 100.0)

        return {
            "jurisdiction": self.jurisdiction,
            "tax_year": tax_year,
            "status": "Estimate",
            "source_data_date": datetime.now().strftime("%Y-%m-%d"),
            "assumptions": assumptions,
            "total_assets": round(total_assets, 2),
            "total_investments": round(investments_value, 2),
            "total_cash": round(cash_value, 2),
            "tax_free_allowance": round(allowance, 2),
            "taxable_assets": round(taxable_wealth, 2),
            "deemed_return_investments": round(deemed_inv, 2),
            "deemed_return_cash": round(deemed_cash, 2),
            "total_deemed_return": round(total_deemed, 2),
            "effective_return_rate": round(effective_rate * 100.0, 2),
            "taxable_benefit": round(taxable_benefit, 2),
            "tax_rate": rules["tax_rate"],
            "estimated_tax_liability": round(estimated_tax, 2),
            "withholding_tax_credit": 0.0,
            "estimated_net_liability": round(estimated_tax, 2),
            "is_below_threshold": False,
        }

    def calculate_from_portfolio(
        self,
        tax_year: int = 2026,
        has_fiscal_partner: bool = False,
    ) -> Dict[str, Any]:
        """Calculates Box 3 based on live SQLite holdings and cash balance."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT SUM(market_value) as total_val FROM holdings")
            row = cursor.fetchone()
            investments_val = float(row["total_val"] or 0.0) if row else 0.0

            # Calculate received dividends in this tax year for withholding tax credit estimation
            cursor.execute(
                """
                SELECT SUM(amount) as div_total, currency
                FROM dividend_events
                WHERE status = 'RECEIVED' AND strftime('%Y', payment_date) = ?
                GROUP BY currency
                """,
                (str(tax_year),),
            )
            div_rows = cursor.fetchall()

        cash_val = float(get_setting("account_free_cash", "0.0") or 0.0)

        res = self.calculate_box3(
            investments_value=investments_val,
            cash_value=cash_val,
            tax_year=tax_year,
            has_fiscal_partner=has_fiscal_partner,
        )

        # Estimate Dutch & Foreign dividend withholding tax credit (approx 15% standard rate)
        total_divs_received = sum(float(r["div_total"] or 0) for r in div_rows)
        # Dutch dividend tax or treaty-creditable tax up to 15%
        withholding_tax_credit = round(total_divs_received * 0.15, 2)
        res["withholding_tax_credit"] = withholding_tax_credit
        res["estimated_net_liability"] = round(max(0.0, res["estimated_tax_liability"] - withholding_tax_credit), 2)
        res["total_dividends_received"] = round(total_divs_received, 2)

        return res

    def export_csv_report(
        self,
        tax_year: int = 2026,
        has_fiscal_partner: bool = False,
    ) -> str:
        """Generates a CSV export of the Box 3 estimate with required headers and disclaimer."""
        data = self.calculate_from_portfolio(tax_year=tax_year, has_fiscal_partner=has_fiscal_partner)

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["# DivYield Netherlands Tax Report (Box 3)"])
        writer.writerow(["# DISCLAIMER: Never present an application estimate as an official tax liability."])
        writer.writerow(["# Calculated locally from synchronized source data."])
        writer.writerow([])
        writer.writerow(["Field", "Value"])
        writer.writerow(["Jurisdiction", data["jurisdiction"]])
        writer.writerow(["Tax Year", data["tax_year"]])
        writer.writerow(["Calculation Status", data["status"]])
        writer.writerow(["Source Data Date", data["source_data_date"]])
        writer.writerow(["Fiscal Partner Included", "Yes" if has_fiscal_partner else "No"])
        writer.writerow(["Total Investments Value (EUR)", f"{data['total_investments']:.2f}"])
        writer.writerow(["Total Cash & Deposits (EUR)", f"{data['total_cash']:.2f}"])
        writer.writerow(["Total Assets (EUR)", f"{data['total_assets']:.2f}"])
        writer.writerow(["Tax-Free Allowance (EUR)", f"{data['tax_free_allowance']:.2f}"])
        writer.writerow(["Taxable Assets Base (EUR)", f"{data['taxable_assets']:.2f}"])
        writer.writerow(["Effective Return Rate (%)", f"{data['effective_return_rate']:.2f}%"])
        writer.writerow(["Taxable Benefit (EUR)", f"{data['taxable_benefit']:.2f}"])
        writer.writerow(["Box 3 Tax Rate (%)", f"{data['tax_rate']:.1f}%"])
        writer.writerow(["Estimated Gross Box 3 Tax (EUR)", f"{data['estimated_tax_liability']:.2f}"])
        writer.writerow(["Dividend Withholding Tax Credit (EUR)", f"{data['withholding_tax_credit']:.2f}"])
        writer.writerow(["Estimated Net Box 3 Payable (EUR)", f"{data['estimated_net_liability']:.2f}"])
        writer.writerow([])
        writer.writerow(["Assumptions:"])
        for a in data["assumptions"]:
            writer.writerow([f"- {a}"])

        return output.getvalue()


tax_calculator_nl = NetherlandsTaxCalculator()
