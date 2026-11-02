import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db
from app.routers.records import seed_heritage_records

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()
    seed_heritage_records()


def test_list_records_returns_seeded_sites():
    response = client.get("/api/records")
    assert response.status_code == 200
    data = response.json()
    assert "records" in data
    assert "total" in data
    assert data["total"] >= 5


def test_filter_records_by_type():
    response = client.get("/api/records?heritage_type=Stepwell / Baoli")
    assert response.status_code == 200
    data = response.json()
    for rec in data["records"]:
        assert rec["heritage_type"] == "Stepwell / Baoli"


def test_filter_records_by_region():
    response = client.get("/api/records?region=Gujarat")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    for rec in data["records"]:
        assert rec["region"] == "Gujarat"


def test_get_record_detail_and_suggestions():
    # First get list
    list_res = client.get("/api/records")
    rec_id = list_res.json()["records"][0]["id"]

    detail_res = client.get(f"/api/records/{rec_id}")
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert "record" in data
    assert "ai_suggestions" in data
    assert "review_events" in data
    assert data["record"]["id"] == rec_id


def test_review_workflow():
    list_res = client.get("/api/records")
    rec_id = list_res.json()["records"][0]["id"]

    review_payload = {
        "action": "approved",
        "reviewer_name": "Prof. Archival Sciences",
        "reviewer_role": "Lead Reviewer",
        "comment": "All field notes and inscriptions verified.",
        "updated_fields": {"description": "Updated peer-reviewed description."}
    }
    review_res = client.post(f"/api/records/{rec_id}/review", json=review_payload)
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "success"
    assert review_res.json()["decision"] == "approved"

    # Verify updated record
    detail_res = client.get(f"/api/records/{rec_id}")
    assert detail_res.json()["record"]["status"] == "approved"
    assert "Updated peer-reviewed description." in detail_res.json()["record"]["description"]


def test_map_records_coordinates():
    response = client.get("/api/map/records")
    assert response.status_code == 200
    data = response.json()
    assert "total_sites" in data
    assert "sites" in data
    assert data["total_sites"] >= 5
    for site in data["sites"]:
        assert site["latitude"] is not None
        assert site["longitude"] is not None


def test_admin_dashboard_metrics():
    response = client.get("/api/admin/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "total_records" in data
    assert "pending_review" in data
    assert "approved_records" in data
    assert "geotagged_sites" in data
    assert "recent_audit_logs" in data
    assert len(data["recent_audit_logs"]) > 0


def test_upload_text_field_notes():
    txt_content = b"Field observation: Stepwell corridor features sandstone lintel with Brahmi inscription."
    files = {"file": ("stepwell_field_notes.txt", txt_content, "text/plain")}
    data = {
        "title": "Adalaj Corridor Fieldwork Notes",
        "region": "Gujarat",
        "heritage_type": "Stepwell / Baoli",
        "source_attribution": "IITGN Student Expedition",
    }
    response = client.post("/api/records/upload", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["record"]["title"] == "Adalaj Corridor Fieldwork Notes"
    assert res_data["record"]["status"] == "pending_review"
    assert len(res_data["ai_suggestions"]) > 0

