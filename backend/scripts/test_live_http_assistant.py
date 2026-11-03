import httpx
import json

def test_live_http():
    url = "http://127.0.0.1:8000/api/assistant/ask"
    payload = {
        "question": "What are the dimensions of the court of Kailasa temple at Ellora?"
    }
    print(f"POST {url} with payload: {payload}")
    
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(url, json=payload)
        print(f"HTTP Status: {resp.status_code}")
        data = resp.json()
        print("Response JSON Keys:", list(data.keys()))
        print(f"Grounding State: {data.get('grounding_state')}")
        print(f"Has Sufficient Evidence: {data.get('has_sufficient_evidence')}")
        print(f"Claims Count: {len(data.get('claims', []))}")
        print(f"Verified Citations: {data.get('verified_citations')}")
        print(f"Answer:\n{data.get('answer')}")
        assert resp.status_code == 200

if __name__ == "__main__":
    test_live_http()

