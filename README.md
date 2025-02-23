# Money Keeper - Ứng dụng Quản lý Chi tiêu Cá nhân Thông minh

<!-- [![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=for-the-badge)]() [![Python Version](https://img.shields.io/badge/python-3.7+-blue.svg?style=for-the-badge)](https://www.python.org/downloads/) do chưa cần nên noclue xd -->

[![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/) [![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT) [![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg?style=for-the-badge)](https://github.com/psf/black)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit&logoColor=white&style=for-the-badge)](https://github.com/pre-commit/pre-commit)
[![CodeFactor](https://www.codefactor.io/repository/github/catalizcs/moneykeeper/badge?style=for-the-badge)](https://www.codefactor.io/repository/github/catalizcs/moneykeeper)

Money Keeper là một ứng dụng web giúp bạn theo dõi chi tiêu, lập ngân sách và đạt được mục tiêu tài chính một cách dễ dàng và hiệu quả. Ứng dụng được xây dựng với Python (Flask), SQLite, và tích hợp AI (LLM cục bộ) để cung cấp các tính năng phân tích và gợi ý thông minh.

## Tính năng chính

- **Ghi chép chi tiêu:** Ghi lại các khoản chi tiêu hàng ngày và phân loại chúng.
- **Quản lý ví:** Tạo và quản lý nhiều ví tiền (ví dụ: Tiền mặt, Tài khoản ngân hàng, v.v.).
- **Lập ngân sách:** Đặt ngân sách cho từng danh mục chi tiêu.
- **Phân tích chi tiêu:** Nhận báo cáo chi tiết, biểu đồ trực quan và phân tích xu hướng chi tiêu.
- **Trợ lý AI (MoneyKeeper AI):**
  - Tự động phân loại chi tiêu.
  - Đề xuất ngân sách.
  - Phân tích mẫu chi tiêu và đưa ra lời khuyên.
  - Trả lời các câu hỏi liên quan đến tài chính cá nhân (bằng tiếng Việt).
  - Có nhiều "tính cách" (thân thiện, nghiêm khắc, hài hước).
- **Bảo mật:** Sử dụng mã PIN để bảo vệ dữ liệu (Lưu ý: Phần mô tả có nhắc đến PIN, nhưng hiện tại code chưa implement. Oni-chan cần thêm tính năng này).
- **Xuất/Nhập dữ liệu:** Xuất dữ liệu chi tiêu ra file Excel.
- **Thông báo:** Nhận thông báo khi chi tiêu gần vượt quá ngân sách.
- **Giao diện:** Thiết kế responsive, thân thiện với người dùng, hỗ trợ tiếng Việt.
- **Single Page Application (SPA):** Trải nghiệm mượt mà, không cần tải lại trang.
- **PWA:** Hỗ trợ cài đặt như một ứng dụng trên iOS (thêm vào màn hình chính).
- **OCR:** Hỗ trợ OCR để quét và tự điền thông tin từ hóa đơn.

## Yêu cầu

- Python 3.7+
- Các thư viện Python (xem file `requirements.txt`)
- Một trình duyệt web hiện đại (Chrome, Firefox, Safari, Edge)
- (Tùy chọn) CUDA-enabled GPU (để tăng tốc độ xử lý AI, nếu không sẽ dùng CPU)

## Cài đặt

1.  **Clone repository:**

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

    Thay `<repository_url>` bằng URL repository của bạn và `<repository_directory>` bằng tên thư mục chứa project.

2.  **Tạo và kích hoạt virtual environment (tùy chọn, nhưng rất khuyến khích):**

    ```bash
    python3 -m venv venv
    source venv/bin/activate   # Linux/macOS
    venv\Scripts\activate    # Windows
    ```

3.  **Cài đặt dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Tải model (nếu chưa có):**

    - Tạo thư mục `models` ở thư mục gốc của project.
    - Tải model về và đặt vào thư mục này (ví dụ: `models/Llama-3.2-3B-Instruct`)

      ```bash
         mkdir models
         cd models
         git lfs install
         git clone https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct # Ví dụ download model
      ```

5.  **Khởi tạo database (nếu chạy lần đầu):**

    ```bash
    flask init-db
    ```

    Hoặc nếu đã có dữ liệu

    ```
     flask create-tables
    ```

6.  (Optional) **Tạo tài khoản admin:**

    ```bash
    python manage.py create_admin
    ```

    (Sửa `manage.py` để thay đổi username/password mặc định)

7.  **Chạy ứng dụng:**

    ```bash
    python run.py
    ```

    Ứng dụng sẽ chạy trên `http://localhost:8000` (hoặc `http://0.0.0.0:8000`).

## Sử dụng

Truy cập vào localhost:8000 trên trình duyệt.

## Cấu hình

- Các tùy chọn cấu hình được đặt trong file `config.py`.
- Bạn có thể tạo các cấu hình khác nhau (ví dụ: `DevelopmentConfig`, `ProductionConfig`) và chọn cấu hình bằng cách set biến môi trường `FLASK_ENV`. Ví dụ:

  ```bash
  export FLASK_ENV=production  # hoặc set FLASK_DEBUG=0
  ```

- **Quan trọng:** Thay đổi `SECRET_KEY` trong `config.py` khi triển khai ứng dụng trên môi trường production.

## Triển khai (Deployment)

- **Không sử dụng Werkzeug development server cho production.** Thay vào đó, hãy sử dụng một WSGI server như Gunicorn hoặc uWSGI. Ví dụ, với Gunicorn:

  ```bash
  pip install gunicorn
  gunicorn --workers 4 --bind 0.0.0.0:8000 app:app  # Thay app:app nếu cần
  ```

- Cấu hình reverse proxy (ví dụ: Nginx) để xử lý các static files và forward request đến Gunicorn.
- Cân nhắc sử dụng HTTPS.
- Đảm bảo rằng thư mục `models` (chứa model AI) có thể truy cập được bởi ứng dụng.

## Contributing

(Phần này Oni-chan tự viết nhé, hướng dẫn cách người khác có thể đóng góp cho project của Oni-chan, ví dụ: quy trình pull request, coding style, v.v.)

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
