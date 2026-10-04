from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "DivYield"
    assert data["version"] == "0.1.0-beta"
    assert data["database"] == "ok"
    assert "timestamp" in data


def test_updates_endpoint():
    response = client.get("/api/v1/updates")
    assert response.status_code == 200
    data = response.json()
    assert "current_version" in data
    assert "update_available" in data



def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    if response.headers.get("content-type", "").startswith("application/json"):
        data = response.json()
        assert "message" in data
    else:
        assert "text/html" in response.headers.get("content-type", "")
