# Money Keeper - Ứng dụng Quản lý Chi tiêu Cá nhân Thông minh

[![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/) [![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/) [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/) [![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT) [![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg?style=for-the-badge)](https://github.com/psf/black)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit&logoColor=white&style=for-the-badge)](https://github.com/pre-commit/pre-commit)
[![CodeFactor](https://www.codefactor.io/repository/github/catalizcs/moneykeeper/badge?style=for-the-badge)](https://www.codefactor.io/repository/github/catalizcs/moneykeeper)

Money Keeper là một ứng dụng web giúp bạn theo dõi chi tiêu, lập ngân sách và đạt được mục tiêu tài chính một cách dễ dàng và hiệu quả. Ứng dụng được xây dựng với kiến trúc hiện đại:
- **Backend**: Flask REST API với Python, SQLite, và tích hợp AI (Google Gemini)
- **Frontend**: React + Vite SPA (Single Page Application)

## Tính năng chính

- **Ghi chép chi tiêu:** Ghi lại các khoản chi tiêu hàng ngày và phân loại chúng.
- **Quản lý ví:** Tạo và quản lý nhiều ví tiền (ví dụ: Tiền mặt, Tài khoản ngân hàng, v.v.).
- **Lập ngân sách:** Đặt ngân sách cho từng danh mục chi tiêu.
- **Phân tích chi tiêu:** Nhận báo cáo chi tiết, biểu đồ trực quan và phân tích xu hướng chi tiêu.
- **Trợ lý AI (MoneyKeeper AI - Powered by Google Gemini):**
  - Tự động phân loại chi tiêu.
  - Đề xuất ngân sách.
  - Phân tích mẫu chi tiêu và đưa ra lời khuyên.
  - Trả lời các câu hỏi liên quan đến tài chính cá nhân (bằng tiếng Việt).
  - Có nhiều "tính cách" (thân thiện, nghiêm khắc, hài hước).
- **Bảo mật:** Sử dụng mã tài khoản và mật khẩu để bảo vệ dữ liệu
- **Xuất/Nhập dữ liệu:** Xuất dữ liệu chi tiêu ra file Excel.
- **Thông báo:** Nhận thông báo khi chi tiêu gần vượt quá ngân sách.
- **Giao diện:** Thiết kế responsive, thân thiện với người dùng, hỗ trợ tiếng Việt.
- **Single Page Application (SPA):** Trải nghiệm mượt mà, không cần tải lại trang.
- **PWA:** Hỗ trợ cài đặt như một ứng dụng trên iOS (thêm vào màn hình chính).
- **OCR:** Hỗ trợ OCR để quét và tự điền thông tin từ hóa đơn.

## Kiến trúc Ứng dụng

Ứng dụng sử dụng kiến trúc tách biệt Frontend/Backend:

- **Frontend (React + Vite)**: nằm trong thư mục `frontend/`, chạy port 3000 (dev), build ra static files
- **Backend (Flask API)**: nằm trong thư mục `backend/`, chạy port 8000 (dev), cung cấp REST API
- **Database**: SQLite cho dữ liệu persistent
- **AI Engine**: Google Gemini API để phân tích và gợi ý thông minh

## Yêu cầu

### Backend
- Python 3.7+
- Các thư viện Python (xem file `backend/requirements.txt`)
- Google API Key (miễn phí) - Lấy tại https://aistudio.google.com/app/apikey

### Frontend
- Node.js 18+ và npm
- Một trình duyệt web hiện đại (Chrome, Firefox, Safari, Edge)

## Cài đặt

1.  **Clone repository:**

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

    Thay `<repository_url>` bằng URL repository của bạn và `<repository_directory>` bằng tên thư mục chứa project.

### Cài đặt Backend

2.  **Tạo và kích hoạt virtual environment (tùy chọn, nhưng khuyến khích):**

    ```bash
    cd backend
    python -m venv venv
    # Linux/macOS
    source venv/bin/activate
    # Windows PowerShell
    .\venv\Scripts\Activate.ps1
    ```

3.  **Cài đặt Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Cấu hình Google AI API:**

    - Tạo file `.env` từ template:

      ```bash
      cp .env.example .env
      ```

    - Lấy API key miễn phí tại: https://aistudio.google.com/app/apikey
    - Mở file `.env` và thêm API key của bạn:

      ```
      GOOGLE_API_KEY=your-api-key-here
      AI_MODEL_NAME=gemini-flash-latest
      ```

5.  **Khởi tạo database (nếu chạy lần đầu):**

    Bạn có thể dùng 1 trong 2 cách:

    - Dùng Flask CLI:
      ```bash
      # từ thư mục backend (đã kích hoạt venv)
      flask --app app:create_app create-tables
      ```
    - Hoặc chạy nhanh bằng Python:
      ```bash
      python - << "PY"
      from app import create_app
      from app.database import db
      app = create_app()
      with app.app_context():
          db.create_all()
          print("Created tables.")
      PY
      ```

    Hoặc nếu đã có dữ liệu

    ```
    flask --app app:create_app create-tables
    ```

6.  (Optional) **Tạo tài khoản admin:**

    ```bash
    # TODO: thêm lệnh create-admin nếu cần
    ```

    (Có thể bổ sung lệnh CLI tạo admin sau)

7.  **Chạy Flask backend:**

    ```bash
    # từ thư mục gốc dự án
    # có thể dùng script tiện lợi (cả FE/BE):
    .\dev.bat

    # hoặc chỉ chạy backend
    python backend\run.py
    ```

    Backend API sẽ chạy trên `http://localhost:8000`.

### Cài đặt Frontend

8.  **Cài đặt Node.js dependencies:**

    ```bash
    cd frontend
    npm install
    ```

9.  **Chạy development server:**

    ```bash
    npm run dev
    ```

    Frontend sẽ chạy trên `http://localhost:3000` và tự động proxy API requests đến backend.

10. **Build cho production:**

    ```bash
    npm run build
    ```

    Build sẽ tạo static files trong `backend/app/static/dist` để Flask backend có thể serve.

## Sử dụng

### Development Mode
1. Chạy Flask backend: `python backend\run.py` (port 8000) hoặc dùng `dev.bat`
2. Chạy Vite dev server: `cd frontend && npm run dev` (port 3000)
3. Truy cập `http://localhost:3000` trên trình duyệt

### Production Mode
1. Build frontend: `cd frontend && npm run build`
2. Chạy Flask backend: `python backend\run.py`
3. Truy cập `http://localhost:8000` trên trình duyệt (Flask sẽ serve static files từ `app/static/dist`)

## Cấu hình

- Các tùy chọn cấu hình được đặt trong file `backend/config.py`.
- Bạn có thể tạo các cấu hình khác nhau (ví dụ: `DevelopmentConfig`, `ProductionConfig`) và chọn cấu hình bằng cách set biến môi trường `FLASK_ENV`. Ví dụ:

  ```bash
  export FLASK_ENV=production  # hoặc set FLASK_DEBUG=0
  ```

- **Quan trọng:** Thay đổi `SECRET_KEY` trong `backend/config.py` hoặc đặt qua biến môi trường khi triển khai production.

## Triển khai (Deployment)

- **Không sử dụng Werkzeug development server cho production.** Thay vào đó, hãy sử dụng một WSGI server như Gunicorn hoặc uWSGI. Ví dụ, với Gunicorn:

  ```bash
  pip install gunicorn
  # Từ thư mục backend
  gunicorn --workers 4 --bind 0.0.0.0:8000 "app:create_app()"
  ```

- Cấu hình reverse proxy (ví dụ: Nginx) để xử lý các static files và forward request đến Gunicorn.
- Cân nhắc sử dụng HTTPS.
- Đảm bảo rằng thư mục `models` (chứa model AI) có thể truy cập được bởi ứng dụng.

## Contributing

- Tạo một nhánh mới từ `main` (ví dụ: `feature/new-feature`, `bugfix/fix-bug`).
- Thực hiện thay đổi trên nhánh của bạn.
- Viết test (nếu có).
- Đảm bảo code tuân thủ coding style (ví dụ: PEP 8).
- Tạo pull request về nhánh `main`.
- Mô tả rõ ràng thay đổi của bạn trong pull request.

## License

MIT License

Copyright (c) [2025] [CatalizCS]

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
