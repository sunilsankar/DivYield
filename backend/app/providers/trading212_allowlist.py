"""Trading 212 Read-Only Provider Security Allowlist.

Trading 212 is STRICTLY READ-ONLY in DivYield.
The application operates exclusively with 'Orders - Execute' disabled.
"""

from typing import Final

# Explicit allowlist of permissible Trading 212 endpoints (read-only)
TRADING212_READ_ALLOWLIST: Final[frozenset[str]] = frozenset(
    [
        "/api/v0/equity/account/info",
        "/api/v0/equity/account/cash",
        "/api/v0/equity/portfolio",
        "/api/v0/equity/metadata/instruments",
        "/api/v0/equity/metadata/exchanges",
        "/api/v0/equity/history/orders",
        "/api/v0/equity/history/dividends",
        "/api/v0/equity/history/transactions",
        "/api/v0/history/orders",
        "/api/v0/history/dividends",
        "/api/v0/history/transactions",
    ]
)

# Explicit denylist of forbidden verbs/actions to prevent accidental mutation
FORBIDDEN_OPERATIONS: Final[frozenset[str]] = frozenset(
    [
        "buy",
        "sell",
        "place_order",
        "execute_order",
        "cancel_order",
        "modify_order",
        "transfer",
        "deposit",
        "withdraw",
        "mutate",
        "delete_order",
    ]
)
