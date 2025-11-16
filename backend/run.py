import os
import sys

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    # Try to load .env from backend directory first, then project root
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
    env_paths = [
        os.path.join(CURRENT_DIR, '.env'),
        os.path.join(PROJECT_ROOT, '.env'),
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            print(f"Loaded environment variables from: {env_path}")
            break
except ImportError:
    # python-dotenv not installed, skip loading .env file
    pass

# Ensure backend dir is on PYTHONPATH so that 'app' package under backend/ is importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = CURRENT_DIR
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, '..'))
for p in (BACKEND_DIR, PROJECT_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

from app import create_app, socketio  # noqa: E402

app = create_app()

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=8000, allow_unsafe_werkzeug=True)


