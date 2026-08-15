"""
Agent-eBPF Universal 1-Click Runner
Starts the web application, checks dependencies, and automatically opens the browser.
"""

import sys
import os
import time
import webbrowser
import subprocess

def main():
    print("=" * 70)
    print("  🛡️⚡ Agent-eBPF: Autonomous Kernel Shield & Cognitive Mind")
    print("  1-Click Universal Starter")
    print("=" * 70)

    # 1. Check requirements
    print("\n[1/3] Checking environment & packages...")
    req_file = os.path.join(os.path.dirname(__file__), "requirements.txt")
    if os.path.exists(req_file):
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_file, "--quiet"])
            print("  ✓ Dependencies verified.")
        except Exception as e:
            print(f"  ⚠️ Pip install warning: {e}")

    # 2. Browser launcher helper thread
    target_url = "http://localhost:8000"
    print(f"\n[2/3] Opening browser at {target_url}...")
    
    def open_browser():
        time.sleep(1.5)
        try:
            webbrowser.open(target_url)
        except Exception:
            pass

    import threading
    t = threading.Thread(target=open_browser, daemon=True)
    t.start()

    # 3. Start Uvicorn Server
    print(f"\n[3/3] Launching Agent-eBPF Web Gateway on port 8000...")
    print(f"  → Dashboard URL : {target_url}")
    print(f"  → MCP SSE Stream: {target_url}/sse")
    print(f"  → API Docs      : {target_url}/docs")
    print("=" * 70)
    print("Press Ctrl+C to stop the platform.\n")

    import uvicorn
    uvicorn.run("mcp_server:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
