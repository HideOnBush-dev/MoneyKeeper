import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

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


