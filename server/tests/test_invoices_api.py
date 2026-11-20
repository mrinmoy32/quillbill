from tests.conftest import auth, invoice_payload, make_client


def test_health_needs_no_login(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_login_required(client):
    assert client.get("/api/v1/invoices").status_code == 401


def test_create_invoice_numbers_and_totals(client):
    c = make_client(client)
    first = client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth()).json()
    second = client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth()).json()
    assert first["number"] == "INV-0001" and second["number"] == "INV-0002"
    assert first["total_minor"] == 1_180_000
    assert first["status"] == "draft"


def test_tenant_isolation(client):
    """User B must never see or touch user A's data."""
    c = make_client(client, "user-a")
    inv = client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth("user-a")).json()
    assert client.get(f"/api/v1/invoices/{inv['id']}", headers=auth("user-b")).status_code == 404
    assert client.get("/api/v1/invoices", headers=auth("user-b")).json()["total"] == 0
    # ...and B can't invoice A's client either
    r = client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth("user-b"))
    assert r.status_code == 404


def test_free_plan_limit(client):
    c = make_client(client)
    for _ in range(3):
        assert client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth()).status_code == 201
    r = client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth())
    assert r.status_code == 402 and r.json()["error"]["code"] == "plan_limit_reached"


def test_status_flow_and_overdue(client):
    c = make_client(client)
    inv = client.post("/api/v1/invoices", json=invoice_payload(c["id"], due_date="2026-11-02"), headers=auth()).json()
    sent = client.post(f"/api/v1/invoices/{inv['id']}/status", json={"status": "sent"}, headers=auth()).json()
    assert sent["display_status"] in ("sent", "overdue")
    paid = client.post(f"/api/v1/invoices/{inv['id']}/status", json={"status": "paid"}, headers=auth()).json()
    assert paid["status"] == "paid"
    # paid invoices are locked
    r = client.put(f"/api/v1/invoices/{inv['id']}", json=invoice_payload(c["id"]), headers=auth())
    assert r.status_code == 409


def test_only_drafts_can_be_deleted(client):
    c = make_client(client)
    inv = client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth()).json()
    client.post(f"/api/v1/invoices/{inv['id']}/status", json={"status": "sent"}, headers=auth())
    assert client.delete(f"/api/v1/invoices/{inv['id']}", headers=auth()).status_code == 409


def test_validation_error_shape(client):
    c = make_client(client)
    r = client.post("/api/v1/invoices", json=invoice_payload(c["id"], items=[]), headers=auth())
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_pdf_and_public_link(client):
    c = make_client(client)
    inv = client.post("/api/v1/invoices", json=invoice_payload(c["id"], notes="Thanks <3 & cheers"), headers=auth()).json()
    pdf = client.get(f"/api/v1/invoices/{inv['id']}/pdf", headers=auth())
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")

    token = inv["share_url"].rsplit("/", 1)[1]
    assert client.get(f"/api/v1/public/invoices/{token}").status_code == 404  # drafts are private
    client.post(f"/api/v1/invoices/{inv['id']}/status", json={"status": "sent"}, headers=auth())
    public = client.get(f"/api/v1/public/invoices/{token}")
    assert public.status_code == 200 and public.json()["invoice"]["number"] == "INV-0001"
    assert client.get(f"/api/v1/public/invoices/{token}/pdf").content.startswith(b"%PDF")


def test_send_email_marks_sent(client):
    c = make_client(client)
    inv = client.post("/api/v1/invoices", json=invoice_payload(c["id"]), headers=auth()).json()
    r = client.post(f"/api/v1/invoices/{inv['id']}/send", json={}, headers=auth())
    assert r.status_code == 200 and r.json()["status"] == "sent"


def test_dashboard_summary(client):
    c = make_client(client)
    inv = client.post("/api/v1/invoices", json=invoice_payload(c["id"], due_date="2026-11-02"), headers=auth()).json()
    client.post(f"/api/v1/invoices/{inv['id']}/status", json={"status": "sent"}, headers=auth())
    s = client.get("/api/v1/invoices/summary", headers=auth()).json()[0]
    assert s["outstanding_minor"] == 1_180_000
