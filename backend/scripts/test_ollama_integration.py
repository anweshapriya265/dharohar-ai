import httpx
from app.core.config import settings
from app.services.llm_service import OllamaProvider

def test_connectivity():
    print("=== TESTING DIRECT OLLAMA CONNECTIVITY ===")
    try:
        resp = httpx.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5.0)
        print(f"Direct HTTP GET {settings.OLLAMA_BASE_URL}/api/tags -> Status: {resp.status_code}")
        data = resp.json()
        models = data.get("models", [])
        print(f"Total models returned: {len(models)}")
        for m in models:
            size_gb = m.get("size", 0) / (1024 ** 3)
            print(f"  - Model: {m.get('name')} | Size: {size_gb:.2f} GB | Modified: {m.get('modified_at')}")
    except Exception as exc:
        print(f"Direct connection failed: {exc}")

    print("\n=== TESTING DHAROHAR AI OLLAMA PROVIDER CLASS ===")
    provider = OllamaProvider()
    print(f"Configured Base URL: {provider.base_url}")
    print(f"Configured Model Name: {provider.model_name}")
    print(f"Connect Timeout: {provider.connect_timeout}s")
    print(f"Request Timeout: {provider.request_timeout}s")
    
    is_avail = provider.is_available()
    print(f"provider.is_available(): {is_avail}")
    
    status_info = provider.check_model_status()
    print(f"provider.check_model_status(): {status_info}")

if __name__ == "__main__":
    test_connectivity()

