import argparse
import logging
import multiprocessing
import socket
import sys
import threading
import time
import traceback
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure backend directory is in sys.path so app.* imports work properly
base_dir = Path(__file__).resolve().parent
backend_dir = base_dir / "backend"
if backend_dir.exists() and str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def show_fatal_error(title: str, message: str):
    """Displays a native dialog or prints fatal error across platforms."""
    logger.error(f"{title}: {message}")
    if sys.platform == "win32":
        try:
            import ctypes
            # MB_ICONERROR = 0x10
            ctypes.windll.user32.MessageBoxW(0, message, title, 0x10)
        except Exception:
            pass

def find_free_port():
    """Finds a free port on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def run_server(fastapi_app, port: int):
    """Runs the FastAPI server via uvicorn with direct app instance."""
    import uvicorn
    uvicorn.run(fastapi_app, host="127.0.0.1", port=port, log_level="warning")

def main():
    multiprocessing.freeze_support()

    try:
        from app.main import app as fastapi_app
        import webview

        parser = argparse.ArgumentParser(description="DivYield Desktop App")
        parser.add_argument("--port", type=int, help="Specify a port for the local server", default=0)
        args = parser.parse_args()

        port = args.port
        if port == 0:
            port = find_free_port()

        logger.info(f"Starting DivYield backend on port {port}...")

        # Start FastAPI server in a daemon thread
        server_thread = threading.Thread(target=run_server, args=(fastapi_app, port), daemon=True)
        server_thread.start()

        # Give server a moment to start
        time.sleep(1.0)

        # Calculate URL
        url = f"http://127.0.0.1:{port}"
        logger.info(f"Opening native window at {url}...")

        # Create webview window
        webview.create_window(
            title="DivYield",
            url=url,
            width=1280,
            height=800,
            min_size=(900, 600),
            text_select=True,
            zoomable=True,
            background_color="#ffffff",
        )

        # Start webview loop (blocks until window closed)
        webview.start(private_mode=False)

    except Exception as exc:
        err_msg = f"An unhandled error occurred while starting DivYield:\n\n{traceback.format_exc()}"
        show_fatal_error("DivYield Startup Error", err_msg)
        sys.exit(1)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
