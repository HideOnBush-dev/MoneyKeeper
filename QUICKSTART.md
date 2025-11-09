# Quick Start Guide - Money Keeper React + Vite

## 🚀 Quick Setup (5 phút)

### 1. Clone và Setup Backend

```bash
git clone <repository_url>
cd money-keeper

# Tạo virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# hoặc: venv\Scripts\activate  # Windows

# Cài đặt dependencies
pip install -r requirements.txt

# Khởi tạo database
flask init-db
```

### 2. Setup Frontend

```bash
cd frontend
npm install
cd ..
```

### 3. Chạy Application

**Cách 1: Sử dụng script (Khuyến nghị)**

```bash
# Linux/macOS
./dev.sh

# Windows
dev.bat
```

**Cách 2: Chạy riêng biệt**

Terminal 1 (Backend):
```bash
python run.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 4. Truy cập

- **Frontend (Development)**: http://localhost:3000
- **Backend API**: http://localhost:8000

## 📁 Cấu trúc Project

```
money-keeper/
├── app/                  # Flask Backend
│   ├── api/             # REST API endpoints
│   ├── auth/            # Authentication
│   ├── models.py        # Database models
│   └── static/dist/     # Frontend build (production)
│
├── frontend/            # React Frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── contexts/   # State management
│   │   └── App.jsx     # Main app
│   └── package.json
│
├── dev.sh / dev.bat    # Development scripts
├── DEVELOPMENT.md      # Detailed guide
└── README.md           # Project overview
```

## 🎯 Features

### Đã hoàn thành ✅
- ✅ React + Vite frontend setup
- ✅ Flask REST API backend
- ✅ Authentication flow (Login/Register/Logout)
- ✅ Protected routing
- ✅ Responsive layout (Desktop & Mobile)
- ✅ Dashboard với statistics
- ✅ CORS configuration
- ✅ Development tools

### Placeholder pages (sẵn sàng implement):
- Chi tiêu (Expenses)
- Ví (Wallets)
- Ngân sách (Budgets)
- Trò chuyện AI (Chat)
- Cài đặt (Settings)
- Thông báo (Notifications)

## 🛠️ Common Commands

### Backend
```bash
# Chạy development server
python run.py

# Tạo database
flask init-db

# Tạo admin user
python manage.py create-admin
```

### Frontend
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔄 Development Workflow

### Thêm page mới

1. Tạo component trong `frontend/src/pages/MyPage.jsx`
2. Thêm route trong `frontend/src/App.jsx`
3. Thêm link trong `frontend/src/components/Layout.jsx`

### Thêm API endpoint mới

1. Thêm route trong `app/api/routes.py`
2. Restart backend server
3. Gọi từ frontend bằng axios

### Build cho Production

```bash
# Build frontend
cd frontend
npm run build

# Static files sẽ được tạo trong app/static/dist/

# Chạy backend (sẽ serve static files)
cd ..
python run.py

# Truy cập: http://localhost:8000
```

## 📚 Documentation

- **README.md** - Project overview
- **DEVELOPMENT.md** - Detailed development guide
- **MIGRATION_SUMMARY.md** - Migration details
- **frontend/README.md** - Frontend specific docs

## 🐛 Troubleshooting

### Port đã được sử dụng
```bash
# Backend (8000)
lsof -ti:8000 | xargs kill -9  # Linux/macOS
netstat -ano | findstr :8000   # Windows

# Frontend (3000)
lsof -ti:3000 | xargs kill -9  # Linux/macOS
netstat -ano | findstr :3000   # Windows
```

### CORS errors
- Đảm bảo backend đang chạy trên port 8000
- Đảm bảo frontend đang chạy trên port 3000
- Kiểm tra CORS config trong `app/__init__.py`

### Build errors
```bash
# Xóa và cài lại dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 🎓 Next Steps

1. **Đọc DEVELOPMENT.md** để hiểu chi tiết architecture
2. **Implement các trang chức năng** từ placeholder pages
3. **Tạo tests** cho components và API endpoints
4. **Optimize performance** với code splitting và lazy loading

## 💡 Tips

- Sử dụng React DevTools để debug components
- Kiểm tra Network tab trong browser để xem API calls
- Frontend auto-reload khi save files (Hot Module Replacement)
- Backend cần restart khi thay đổi Python code (trừ khi dùng debug mode)

---

**Happy Coding! 🚀**
