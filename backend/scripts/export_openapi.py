"""
Static OpenAPI Schema Exporter for KSEC FastMCP Gateway.
Exports openapi.json directly from FastAPI application without spinning up a live server.
"""

import json
import sys
from pathlib import Path

# Add project root to sys.path to enable direct imports
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

try:
    from mcp_server import app
except ImportError:
    try:
        from app.main import app
    except ImportError:
        raise RuntimeError("Could not locate FastAPI app instance in mcp_server or app.main")


def generate_openapi():
    output_path = project_root / "frontend" / "src" / "types" / "openapi.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    openapi_schema = app.openapi()
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)

    print(f"[OK] OpenAPI schema successfully exported to: {output_path}")


if __name__ == "__main__":
    generate_openapi()
