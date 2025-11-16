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
- Environment variables are read from your shell or `.env` file; configure `SECRET_KEY`, `DATABASE_URL`, `GOOGLE_API_KEY`, etc. as needed.
- Dev server runs on http://localhost:8000 by default.

## Cấu hình Google AI (Gemini API)

Để sử dụng tính năng AI Chat và OCR, bạn cần cấu hình `GOOGLE_API_KEY`:

1. **Lấy API Key**: Truy cập https://aistudio.google.com/apikey và tạo API key
2. **Cấu hình**: 
   - Tạo file `.env` trong thư mục `backend/` với nội dung:
     ```
     GOOGLE_API_KEY=your_api_key_here
     ```
   - Hoặc set environment variable: `$env:GOOGLE_API_KEY="your_api_key_here"` (PowerShell)
3. **Khởi động lại**: Restart backend server

Xem chi tiết tại: [SETUP_AI.md](SETUP_AI.md)


