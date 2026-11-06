from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    api_response = client.get("/api/health")
    assert api_response.status_code == 200
    assert api_response.json()["status"] == "ok"


def test_clean_compliant_text():
    response = client.post(
        "/api/v1/audit/stage1",
        json={
            "text": "AcmeCloud provides a 99.9% monthly uptime availability SLA with SOC2 Type II certification."
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] is True
    assert data["blocker_count"] == 0
    assert data["warning_count"] == 0
    assert len(data["violations"]) == 0
    assert data["stage1_latency_ms"] < 50.0


def test_blocker_rules_and_char_offsets():
    text = "We offer 100% guaranteed returns and an unhackable cloud."
    response = client.post(
        "/api/v1/audit/stage1",
        json={"text": text},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] is False
    assert data["blocker_count"] == 2
    violations = data["violations"]
    assert violations[0]["rule_id"] == "RULE_FIN_001"
    assert violations[0]["matched_text"] == "100% guaranteed returns"
    for v in violations:
        assert text[v["start_char"] : v["end_char"]] == v["matched_text"]


def test_warning_only_passes_stage1():
    response = client.post(
        "/api/v1/audit/stage1",
        json={"text": "AcmeCloud is the undisputed market leader unlike LegacyCorp."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["passed"] is True
    assert data["blocker_count"] == 0
    assert data["warning_count"] == 2
    rule_ids = [v["rule_id"] for v in data["violations"]]
    assert rule_ids == ["RULE_MKT_005", "RULE_COMP_006"]


def test_empty_text_validation_error():
    response = client.post(
        "/api/v1/audit/stage1",
        json={"text": ""},
    )
    assert response.status_code == 422

