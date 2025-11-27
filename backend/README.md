# Backend

Running locally:

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows
pip install -r requirements.txt
python run.py
```

Notes:
- The Flask `app/` package is located at the project root. `backend/run.py` adjusts `PYTHONPATH` to import it.
- Environment variables are read from your shell; configure `SECRET_KEY`, `DATABASE_URL`, `GOOGLE_API_KEY`, etc. as needed.
- Dev server runs on http://localhost:8000 by default.


