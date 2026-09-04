"""
KSEC v2.0 — Production 1-Click Gateway & Web Engine (ksec.space)
Starts the minimal high-performance web gateway, static assets, and MCP server.
"""

import sys
import os
import time
import webbrowser
import subprocess

def main():
    print("=" * 72)
    print("  [KSEC v2.0] Autonomous Ring-0 AI Defense Engine (ksec.space)")
    print("  Sub-35us Deterministic Security Gateway & Enterprise Workbench")
    print("=" * 72)

    # 1. Check requirements
    print("\n[1/3] Verifying runtime environment & dependencies...")
    req_file = os.path.join(os.path.dirname(__file__), "requirements.txt")
    if os.path.exists(req_file):
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_file, "--quiet"])
            print("  - Dependencies verified.")
        except Exception as e:
            print(f"  - Package installation notice: {e}")

    # 2. Browser launcher helper thread
    target_url = os.getenv("KSEC_LIVE_URL", "https://ksec.space")
    print(f"\n[2/3] Live gateway configured at {target_url}...")
    
    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(target_url)
        except Exception:
            pass

    import threading
    t = threading.Thread(target=open_browser, daemon=True)
    t.start()

    # 3. Start Uvicorn Server
    print(f"\n[3/3] Launching KSEC Production Gateway on port 8000...")
    print(f"  - Apex Landing   : {target_url} (ksec.space)")
    print(f"  - Mission Control: {target_url}/console")
    print(f"  - Whitepaper     : {target_url}/whitepaper")
    print(f"  - MCP SSE Stream : {target_url}/sse")
    print(f"  - API Docs       : {target_url}/docs")
    print("=" * 72)
    print("KSEC Defense Engine is live. Press Ctrl+C to terminate.\n")

    import uvicorn
    uvicorn.run("mcp_server:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
