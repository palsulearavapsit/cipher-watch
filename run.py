import os
import sys
import time
import subprocess
import webbrowser
import urllib.request
import urllib.error
import platform
import threading

# Define paths relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

BACKEND_URL = "http://127.0.0.1:8000/health"
FRONTEND_URL = "http://localhost:5173"

def kill_process_tree(proc):
    """Cleanly terminates the subprocess and all its children to prevent orphan processes."""
    if proc is None:
        return
    pid = proc.pid
    if platform.system() == "Windows":
        try:
            # Forcefully terminate the process and all child processes started by it
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], 
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            try:
                proc.terminate()
            except Exception:
                pass
    else:
        try:
            proc.terminate()
        except Exception:
            pass

def log_streamer(proc, prefix):
    """Read lines from stdout and print them to console to maintain logs visibility."""
    try:
        for line in iter(proc.stdout.readline, ''):
            if not line:
                break
            print(f"{prefix} {line.strip()}", flush=True)
    except Exception:
        pass
    finally:
        try:
            proc.stdout.close()
        except Exception:
            pass

def main():
    print("=" * 60)
    print("      CipherWatch - Integrated Startup Script")
    print("=" * 60)

    # 1. Start the Backend
    print("\n[1/4] Starting Backend (FastAPI)...")
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    env["PYTHONUNBUFFERED"] = "1"
    
    # Run uvicorn using the current Python environment
    backend_cmd = [
        sys.executable, "-m", "uvicorn", 
        "sentinel.api.app:create_app", 
        "--factory", 
        "--host", "127.0.0.1", 
        "--port", "8000"
    ]
    
    try:
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=BACKEND_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
    except Exception as e:
        print(f"[-] Failed to start backend: {e}")
        return

    # Start backend logging thread
    threading.Thread(target=log_streamer, args=(backend_proc, "[Backend]"), daemon=True).start()

    # 2. Wait for Warmup
    print("\n[2/4] Waiting for backend warmup & health check...")
    warmed_up = False
    start_time = time.time()
    import socket
    
    while time.time() - start_time < 60:  # Increase timeout to 60 seconds to be safe
        if backend_proc.poll() is not None:
            print("[-] Backend process crashed during startup.", flush=True)
            break
        try:
            # Uvicorn only opens the port after the lifespan warmup completes successfully.
            # Thus, a successful socket connection guarantees the backend is ready.
            with socket.create_connection(("127.0.0.1", 8000), timeout=1.0):
                warmed_up = True
                break
        except (socket.timeout, OSError):
            print(".", end="", flush=True)
        time.sleep(1.0)

    if not warmed_up:
        print("\n[-] Backend did not warm up in time or health check failed.")
        kill_process_tree(backend_proc)
        return
    
    print("\n[+] Backend is warmed up and healthy!")

    # 3. Start the Frontend
    print("\n[3/4] Starting Frontend (Vite)...")
    try:
        # On Windows, npm commands require shell=True
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=FRONTEND_DIR,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
    except Exception as e:
        print(f"[-] Failed to start frontend: {e}")
        kill_process_tree(backend_proc)
        return

    # Start frontend logging thread
    threading.Thread(target=log_streamer, args=(frontend_proc, "[Frontend]"), daemon=True).start()

    # Wait a couple of seconds for the dev server to start listening
    time.sleep(3.0)

    # 4. Open browser
    print(f"\n[4/4] Opening dashboard in browser: {FRONTEND_URL}")
    def open_browser():
        try:
            webbrowser.open(FRONTEND_URL)
        except Exception as e:
            print(f"[-] Failed to open browser automatically: {e}")
    threading.Thread(target=open_browser, daemon=True).start()

    print("\n" + "=" * 60)
    print(" CipherWatch is running successfully!")
    print(" - Backend: http://127.0.0.1:8000")
    print(" - Frontend: http://localhost:5173")
    print(" Press Ctrl+C to terminate both servers.")
    print("=" * 60 + "\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                print("[-] Backend process terminated unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("[-] Frontend process terminated unexpectedly.")
                break
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\n[+] Shutting down servers gracefully...")
    finally:
        kill_process_tree(backend_proc)
        kill_process_tree(frontend_proc)
        print("[+] Done. Goodbye!")

if __name__ == "__main__":
    main()
