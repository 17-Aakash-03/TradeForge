import pytest
import requests

BASE = "http://127.0.0.1:8000"

def get_token():
    r = requests.post(f"{BASE}/auth/login", json={
        "email": "admin@tradeforge.com",
        "password": "admin123"
    })
    return r.json()["access_token"]

def test_health():
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_root():
    r = requests.get(f"{BASE}/")
    assert r.status_code == 200
    assert "TradeForge" in r.json()["app"]

def test_login():
    r = requests.post(f"{BASE}/auth/login", json={
        "email": "admin@tradeforge.com",
        "password": "admin123"
    })
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_login_wrong_password():
    r = requests.post(f"{BASE}/auth/login", json={
        "email": "admin@tradeforge.com",
        "password": "wrongpassword"
    })
    assert r.status_code == 401

def test_auth_me():
    token = get_token()
    r = requests.get(f"{BASE}/auth/me",
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "admin@tradeforge.com"

def test_predict_reliance():
    token = get_token()
    r = requests.get(f"{BASE}/predict/RELIANCE.NS",
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "signal" in data
    assert data["signal"] in ["BUY", "SELL", "HOLD"]

def test_predict_tcs():
    token = get_token()
    r = requests.get(f"{BASE}/predict/TCS.NS",
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["signal"] in ["BUY", "SELL", "HOLD"]

def test_predict_btc():
    token = get_token()
    r = requests.get(f"{BASE}/predict/BTC-USD",
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["signal"] in ["BUY", "SELL", "HOLD"]

def test_backtest():
    token = get_token()
    r = requests.get(f"{BASE}/backtest/RELIANCE.NS?capital=100000",
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "total_return" in data
    assert "final_value" in data

def test_retrain_status():
    token = get_token()
    r = requests.get(f"{BASE}/retrain/status",
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "models" in r.json()

def test_paper_portfolio():
    token = get_token()
    r = requests.get(f"{BASE}/paper/portfolio",
        headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "cash_balance" in r.json()

def test_unauthorized_access():
    r = requests.get(f"{BASE}/predict/RELIANCE.NS")
    assert r.status_code == 401

if __name__ == "__main__":
    print("Running TradeForge API tests...")
    tests = [
        test_health, test_root, test_login,
        test_login_wrong_password, test_auth_me,
        test_predict_reliance, test_predict_tcs,
        test_predict_btc, test_backtest,
        test_retrain_status, test_paper_portfolio,
        test_unauthorized_access
    ]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS: {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  FAIL: {test.__name__} - {e}")
            failed += 1
    print(f"\nResults: {passed} passed, {failed} failed")