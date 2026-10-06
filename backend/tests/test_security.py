"""Tests for desktop app security lock endpoints."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_security_flow():
    # 1. Initially no password is set
    res = client.get("/api/v1/security/status")
    assert res.status_code == 200
    assert res.json() == {"is_password_set": False}

    # 2. Set password
    res = client.post("/api/v1/security/set", json={"password": "secretPassword123"})
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 3. Status is now True
    res = client.get("/api/v1/security/status")
    assert res.status_code == 200
    assert res.json() == {"is_password_set": True}

    # 4. Verify correct and incorrect password
    res = client.post("/api/v1/security/verify", json={"password": "wrong"})
    assert res.status_code == 200
    assert res.json() == {"valid": False}

    res = client.post("/api/v1/security/verify", json={"password": "secretPassword123"})
    assert res.status_code == 200
    assert res.json() == {"valid": True}

    # 5. Remove password with wrong current password fails
    res = client.post("/api/v1/security/remove", json={"current_password": "wrong"})
    assert res.status_code == 400

    # 6. Remove password with correct current password succeeds
    res = client.post("/api/v1/security/remove", json={"current_password": "secretPassword123"})
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 7. Status is now False
    res = client.get("/api/v1/security/status")
    assert res.status_code == 200
    assert res.json() == {"is_password_set": False}
