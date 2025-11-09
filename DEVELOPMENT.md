# Development Guide - Money Keeper

## Kiến trúc Dự án

Money Keeper sử dụng kiến trúc tách biệt Frontend/Backend:

### Backend (Flask)
- **Vị trí**: Thư mục gốc dự án
- **Port**: 8000
- **Công nghệ**: Flask, SQLAlchemy, Flask-Login
- **Endpoints**:
  - `/auth/*` - Authentication (login, register, logout)
  - `/api/*` - REST API endpoints
  - `/` - Serve static files (production)

### Frontend (React + Vite)
- **Vị trí**: `frontend/`
- **Port dev**: 3000
- **Công nghệ**: React 19, Vite 7, React Router, Axios
- **Build output**: `app/static/dist/`

## Cài đặt Development Environment

### 1. Backend Setup

```bash
# Tạo virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# hoặc
venv\Scripts\activate  # Windows

# Cài đặt dependencies
pip install -r requirements.txt

# Khởi tạo database (lần đầu)
flask init-db

# Tạo admin user (optional)
python manage.py create-admin
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Chạy Development Server

### Cách 1: Chạy riêng biệt (Khuyến nghị)

**Terminal 1 - Backend:**
```bash
python run.py
```
Backend sẽ chạy tại: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend sẽ chạy tại: http://localhost:3000

Truy cập http://localhost:3000 để sử dụng ứng dụng. Vite sẽ tự động proxy các API requests đến backend.

### Cách 2: Chạy cùng lúc (Production-like)

```bash
# Build frontend
cd frontend
npm run build

# Chạy backend (sẽ serve static files)
cd ..
python run.py
```

Truy cập http://localhost:8000 để sử dụng ứng dụng.

## Workflow Development

### Thay đổi Frontend

1. Chỉnh sửa files trong `frontend/src/`
2. Vite sẽ tự động hot-reload
3. Test changes tại http://localhost:3000

### Thay đổi Backend

1. Chỉnh sửa files Python
2. Restart Flask server (hoặc dùng Flask debug mode để auto-reload)
3. Frontend sẽ tự động gọi APIs mới

### Thêm API Endpoint mới

1. Thêm route trong `app/api/routes.py`
2. Restart backend server
3. Gọi API từ frontend bằng axios trong `frontend/src/`

### Thêm React Component/Page mới

1. Tạo component trong `frontend/src/components/` hoặc page trong `frontend/src/pages/`
2. Thêm route (nếu là page) trong `frontend/src/App.jsx`
3. Import và sử dụng component

## Build cho Production

```bash
# Build frontend
cd frontend
npm run build

# Files sẽ được build vào app/static/dist/
# Flask sẽ tự động serve các files này

# Chạy production server với Gunicorn (khuyến nghị)
pip install gunicorn
gunicorn --workers 4 --bind 0.0.0.0:8000 "app:create_app()"
```

## Cấu trúc Thư mục

```
money-keeper/
├── app/                    # Flask backend
│   ├── api/               # REST API endpoints
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── auth/              # Authentication
│   ├── main/              # Main routes (legacy)
│   ├── static/
│   │   └── dist/          # Frontend build output
│   ├── templates/         # Jinja templates (legacy)
│   └── __init__.py
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   ├── utils/         # Utilities
│   │   ├── App.jsx        # Main app
│   │   └── main.jsx       # Entry point
│   ├── public/            # Static assets
│   ├── index.html
│   ├── vite.config.js     # Vite configuration
│   └── package.json
├── config.py              # Flask configuration
├── run.py                 # Flask entry point
└── requirements.txt       # Python dependencies
```

## API Endpoints

### Authentication
- `POST /auth/login` - Đăng nhập
- `POST /auth/register` - Đăng ký
- `GET /auth/logout` - Đăng xuất

### API
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `GET /api/dashboard` - Lấy thống kê dashboard
- `GET /api/expenses` - Lấy danh sách chi tiêu
- `GET /api/wallets` - Lấy danh sách ví
- `GET /api/budgets` - Lấy danh sách ngân sách

## Testing

### Backend Tests
```bash
# TODO: Add backend tests
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## Troubleshooting

### CORS Issues
- Đảm bảo Flask-CORS đã được cài đặt: `pip install Flask-CORS`
- Kiểm tra CORS configuration trong `app/__init__.py`
- Frontend dev server phải chạy trên port 3000

### Session/Cookie Issues
- Đảm bảo `SESSION_COOKIE_SAMESITE` được cấu hình đúng trong `config.py`
- Trong development, cookies được share giữa localhost:3000 và localhost:8000

### Build Issues
- Xóa `node_modules` và chạy `npm install` lại
- Xóa `app/static/dist` và build lại
- Kiểm tra `vite.config.js` cho build output path

## Contributing

1. Tạo feature branch từ `main`
2. Implement changes
3. Test thoroughly
4. Submit pull request với mô tả rõ ràng
