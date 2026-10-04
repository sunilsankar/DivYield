"""Automated tests proving Trading 212 read-only security compliance.

Mandate: Trading 212 must remain strictly read-only.
- Orders - Execute must not be required.
- No buy/sell/order mutation routes or methods exist.
"""

import inspect
from app.main import app
from app.providers import trading212_allowlist


def test_trading212_allowlist_contains_only_read_endpoints():
    """Verify that every endpoint in the allowlist is a known read-only endpoint."""
    for endpoint in trading212_allowlist.TRADING212_READ_ALLOWLIST:
        assert endpoint.startswith(("/api/v0/equity/", "/api/v0/history/"))
        for forbidden in ["order/place", "order/cancel", "order/modify", "transfer"]:
            assert forbidden not in endpoint.lower()


def test_no_mutation_routes_in_fastapi():
    """Verify that no registered route in FastAPI allows trade execution or mutation."""
    forbidden_terms = ["buy", "sell", "place_order", "execute_order", "cancel_order", "trade"]
    for route in app.routes:
        path = getattr(route, "path", "")
        name = getattr(route, "name", "")
        methods = getattr(route, "methods", set())

        # Check path and name
        for term in forbidden_terms:
            assert term not in path.lower(), f"Forbidden term '{term}' found in route path: {path}"
            assert term not in name.lower(), f"Forbidden term '{term}' found in route name: {name}"

        # If it's a mutation HTTP method, ensure it's not touching trading
        if methods.intersection({"POST", "PUT", "PATCH", "DELETE"}):
            assert "order" not in path.lower(), f"Mutation route on orders detected: {path}"
            assert "trade" not in path.lower(), f"Mutation route on trade detected: {path}"


def test_forbidden_operations_list():
    """Verify that standard mutation operations are explicitly forbidden."""
    assert "buy" in trading212_allowlist.FORBIDDEN_OPERATIONS
    assert "sell" in trading212_allowlist.FORBIDDEN_OPERATIONS
    assert "place_order" in trading212_allowlist.FORBIDDEN_OPERATIONS
    assert "cancel_order" in trading212_allowlist.FORBIDDEN_OPERATIONS
