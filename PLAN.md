# Money Keeper - Kế hoạch phát triển tính năng

> Tài liệu này tracking các tính năng đang thiếu và kế hoạch triển khai

---

## 📊 Tổng quan

- **Tổng số tính năng:** 15
- **Đã hoàn thành:** 3 (Savings Goals, Recurring Transactions, Debt Tracking)
- **Đang phát triển:** 0
- **Chưa bắt đầu:** 12

---

## 🎯 Tính năng theo độ ưu tiên

### 🔴 Priority 1 - Tính năng cốt lõi

#### 1. Mục tiêu tiết kiệm (Savings Goals)
- **Status:** ✅ Completed
- **Priority:** High
- **Estimated Time:** 2-3 days
- **Dependencies:** None

**Mô tả:**
Cho phép người dùng đặt mục tiêu tiết kiệm, theo dõi tiến độ và nhận cảnh báo khi đạt mục tiêu.

**Kế hoạch triển khai:**
- [x] **Backend:**
  - [x] Tạo model `SavingsGoal` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `name`, `target_amount`, `current_amount`, `deadline`, `description`, `icon`, `color`, `created_at`, `updated_at`
  - [x] Tạo API endpoints trong `backend/app/api/goals.py`
    - `GET /api/goals` - Lấy danh sách mục tiêu
    - `POST /api/goals` - Tạo mục tiêu mới
    - `GET /api/goals/<id>` - Chi tiết mục tiêu
    - `PUT /api/goals/<id>` - Cập nhật mục tiêu
    - `DELETE /api/goals/<id>` - Xóa mục tiêu
    - `POST /api/goals/<id>/add` - Thêm tiền vào mục tiêu
    - `GET /api/goals/<id>/progress` - Tiến độ mục tiêu
    - `GET /api/goals/active` - Lấy mục tiêu đang active
  - [x] Tạo notification khi đạt mục tiêu
  - [x] Migration database (model đã có trong codebase)
- [x] **Frontend:**
  - [x] Tạo page `frontend/src/pages/Goals.jsx`
  - [x] Component hiển thị danh sách mục tiêu với progress bar
  - [x] Form tạo/chỉnh sửa mục tiêu
  - [x] Modal thêm tiền vào mục tiêu
  - [x] Tích hợp vào Dashboard (hiển thị mục tiêu đang active)
  - [x] Thêm route vào `App.jsx`
  - [x] Thêm navigation link trong `Layout.jsx`
  - [x] API client đã có trong `frontend/src/services/api.js`
- [ ] **AI Integration:**
  - [x] Cập nhật Chat để hỗ trợ lệnh `/goal` đầy đủ (đã có trong `Chat.jsx`)
  - [ ] AI có thể tạo mục tiêu từ chat (cần kiểm tra backend chat handler)
  - [ ] AI phân tích tiến độ mục tiêu

**Notes:**
- Có thể liên kết mục tiêu với ví cụ thể
- Tự động tính toán tiến độ dựa trên số tiền đã tiết kiệm
- Cảnh báo khi gần đến deadline

---

#### 2. Giao dịch định kỳ/Đăng ký (Recurring Transactions)
- **Status:** ✅ Completed
- **Priority:** High
- **Estimated Time:** 3-4 days
- **Dependencies:** None

**Mô tả:**
Tự động tạo giao dịch định kỳ cho các khoản như Netflix, điện thoại, gym, v.v.

**Kế hoạch triển khai:**
- [x] **Backend:**
  - [x] Tạo model `RecurringTransaction` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `name`, `amount`, `category`, `frequency` (daily/weekly/monthly/yearly), `start_date`, `end_date`, `next_due_date`, `wallet_id`, `description`, `is_active`, `auto_create`, `is_expense`, `created_at`, `updated_at`
  - [x] Tạo API endpoints trong `backend/app/api/recurring.py`
    - `GET /api/recurring` - Danh sách giao dịch định kỳ
    - `POST /api/recurring` - Tạo mới
    - `GET /api/recurring/<id>` - Chi tiết
    - `PUT /api/recurring/<id>` - Cập nhật
    - `DELETE /api/recurring/<id>` - Xóa
    - `POST /api/recurring/<id>/skip` - Bỏ qua lần này
    - `POST /api/recurring/<id>/execute` - Thực thi ngay
    - `GET /api/recurring/upcoming` - Sắp đến hạn (7 ngày)
  - [x] Tạo background task/scheduler để tự động tạo expense
    - Sử dụng APScheduler
    - Chạy daily job lúc 2:00 AM để check và tạo transactions
  - [x] Migration database (model đã được import trong __init__.py)
- [x] **Frontend:**
  - [x] Tạo page `frontend/src/pages/Recurring.jsx`
  - [x] Component danh sách giao dịch định kỳ
  - [x] Form tạo/chỉnh sửa với frequency selector
  - [x] Hiển thị next due date và days until
  - [x] Tích hợp vào Dashboard (upcoming recurring)
  - [x] Thêm route và navigation (desktop & mobile)
  - [x] API client đã có trong `frontend/src/services/api.js`
- [ ] **AI Integration:**
  - [ ] AI có thể tạo recurring transaction từ chat
  - [ ] AI nhắc nhở về upcoming payments

**Notes:**
- Cần xử lý timezone đúng cách
- Cho phép skip một lần thanh toán
- Có thể pause/resume recurring transaction

---

#### 3. Quản lý nợ (Debt Tracking)
- **Status:** ✅ Completed
- **Priority:** Medium
- **Estimated Time:** 3-4 days
- **Dependencies:** None

**Mô tả:**
Theo dõi các khoản nợ, lịch trả nợ, lãi suất và cảnh báo đến hạn.

**Kế hoạch triển khai:**
- [x] **Backend:**
  - [x] Tạo model `Debt` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `name`, `creditor_name`, `total_amount`, `remaining_amount`, `interest_rate`, `start_date`, `due_date`, `payment_frequency`, `next_payment_date`, `next_payment_amount`, `description`, `is_paid`, `is_lending`, `wallet_id`, `created_at`, `updated_at`
  - [x] Tạo model `DebtPayment` để track các lần trả
    - Fields: `id`, `debt_id`, `amount`, `payment_date`, `notes`, `created_at`
  - [x] Tạo API endpoints trong `backend/app/api/debts.py`
    - `GET /api/debts` - Danh sách nợ
    - `POST /api/debts` - Tạo nợ mới
    - `GET /api/debts/<id>` - Chi tiết nợ
    - `PUT /api/debts/<id>` - Cập nhật
    - `DELETE /api/debts/<id>` - Xóa
    - `POST /api/debts/<id>/pay` - Ghi nhận thanh toán
    - `GET /api/debts/<id>/payments` - Lịch sử thanh toán
    - `GET /api/debts/upcoming` - Các khoản đến hạn (trong 7 ngày)
    - `GET /api/debts/statistics` - Thống kê tổng quan
  - [x] Migration database (script đã tạo trong `migrations/create_debt_tables.py`)
- [x] **Frontend:**
  - [x] Tạo page `frontend/src/pages/Debts.jsx`
  - [x] Component danh sách nợ với progress bar và thống kê
  - [x] Form tạo/chỉnh sửa nợ với đầy đủ fields
  - [x] Modal ghi nhận thanh toán
  - [x] Modal xem lịch sử thanh toán
  - [x] Phân loại: Nợ đang nợ / Cho vay / Đã thanh toán
  - [x] Tích hợp vào Dashboard (hiển thị upcoming debts)
  - [x] Thêm route `/debts` và navigation (desktop & mobile)
  - [x] API client đã có trong `frontend/src/services/api.js`
- [ ] **AI Integration:**
  - [ ] AI phân tích tình hình nợ
  - [ ] AI đưa ra lời khuyên trả nợ

**Notes:**
- ✅ Hỗ trợ cả nợ cho người khác (lending) và nợ từ người khác (owing)
- ✅ Có field lãi suất (interest_rate) để tính toán
- ✅ Cảnh báo khi gần đến hạn trả (trong Dashboard)
- ✅ Hiển thị thống kê: tổng nợ, tổng cho vay, vị thế ròng

---

### 🟡 Priority 2 - Tính năng hỗ trợ

#### 4. Nhắc nhở hóa đơn (Bill Reminders)
- **Status:** ⏳ Pending
- **Priority:** Medium
- **Estimated Time:** 2-3 days
- **Dependencies:** Recurring Transactions (có thể tái sử dụng logic)

**Mô tả:**
Lưu thông tin hóa đơn, ngày đến hạn, tự động nhắc nhở và đánh dấu đã thanh toán.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `Bill` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `name`, `amount`, `category`, `due_date`, `reminder_days` (số ngày trước khi nhắc), `is_paid`, `paid_date`, `wallet_id`, `description`, `recurring_id` (link với recurring), `created_at`, `updated_at`
  - [ ] Tạo API endpoints trong `backend/app/api/bills.py`
    - `GET /api/bills` - Danh sách hóa đơn
    - `POST /api/bills` - Tạo mới
    - `PUT /api/bills/<id>` - Cập nhật
    - `DELETE /api/bills/<id>` - Xóa
    - `POST /api/bills/<id>/mark-paid` - Đánh dấu đã trả
    - `GET /api/bills/upcoming` - Hóa đơn sắp đến hạn
  - [ ] Tạo notification system cho bills
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Tạo page `frontend/src/pages/Bills.jsx`
  - [ ] Component danh sách hóa đơn với due date
  - [ ] Form tạo/chỉnh sửa hóa đơn
  - [ ] Quick action: mark as paid
  - [ ] Tích hợp vào Dashboard (upcoming bills)
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI nhắc nhở về bills sắp đến hạn
  - [ ] AI có thể tạo bill từ chat

**Notes:**
- Có thể link với Recurring Transaction
- Tự động tạo expense khi mark as paid
- Cảnh báo theo số ngày trước due date

---

#### 5. Chia sẻ chi tiêu (Expense Splitting)
- **Status:** ⏳ Pending
- **Priority:** Medium
- **Estimated Time:** 4-5 days
- **Dependencies:** None

**Mô tả:**
Chia tiền với người khác, ghi nợ và theo dõi ai nợ ai bao nhiêu.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `ExpenseSplit` trong `backend/app/models.py`
    - Fields: `id`, `expense_id`, `user_id`, `amount`, `is_paid`, `paid_date`, `notes`
  - [ ] Tạo model `SplitGroup` để quản lý nhóm
    - Fields: `id`, `name`, `description`, `created_at`
  - [ ] Tạo model `SplitMember` để quản lý thành viên
    - Fields: `id`, `group_id`, `user_id`, `name` (nếu không phải user), `email`, `is_user`
  - [ ] Tạo API endpoints trong `backend/app/api/splits.py`
    - `POST /api/expenses/<id>/split` - Chia chi tiêu
    - `GET /api/splits` - Danh sách splits
    - `GET /api/splits/owed` - Số tiền người khác nợ mình
    - `GET /api/splits/owing` - Số tiền mình nợ người khác
    - `POST /api/splits/<id>/settle` - Thanh toán
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Component split expense trong form thêm expense
  - [ ] Tạo page `frontend/src/pages/Splits.jsx`
  - [ ] Hiển thị danh sách nợ/được nợ
  - [ ] Form thêm thành viên vào split
  - [ ] Tích hợp vào Dashboard
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI có thể tạo split từ chat
  - [ ] AI nhắc nhở về các khoản nợ

**Notes:**
- Hỗ trợ chia đều hoặc chia theo tỷ lệ
- Có thể thêm người không phải user (chỉ cần tên)
- Tính toán tự động ai nợ ai

---

#### 6. Đính kèm ảnh hóa đơn (Receipt Gallery)
- **Status:** ⏳ Pending
- **Priority:** Medium
- **Estimated Time:** 3-4 days
- **Dependencies:** OCR (đã có)

**Mô tả:**
Lưu trữ và quản lý ảnh hóa đơn, tìm kiếm theo ảnh.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Thêm field `receipt_image` vào model `Expense`
  - [ ] Tạo model `Receipt` trong `backend/app/models.py` (nếu cần riêng)
    - Fields: `id`, `expense_id`, `image_path`, `ocr_text`, `extracted_data` (JSON), `created_at`
  - [ ] Cập nhật API upload image trong `backend/app/api/expenses.py`
  - [ ] Tạo API endpoints trong `backend/app/api/receipts.py`
    - `GET /api/receipts` - Danh sách receipts
    - `GET /api/receipts/<id>` - Chi tiết receipt
    - `POST /api/receipts/upload` - Upload ảnh
    - `DELETE /api/receipts/<id>` - Xóa receipt
  - [ ] Tích hợp với OCR hiện có
  - [ ] Lưu trữ file (local hoặc cloud storage)
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Component upload ảnh trong form expense
  - [ ] Tạo page `frontend/src/pages/Receipts.jsx` (gallery view)
  - [ ] Hiển thị ảnh thumbnail
  - [ ] Modal xem ảnh full size
  - [ ] Tích hợp OCR scanner vào form
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI có thể phân tích receipt và đề xuất category

**Notes:**
- Hỗ trợ nhiều format: JPG, PNG, PDF
- Compress ảnh để tiết kiệm storage
- Có thể search theo text từ OCR

---

#### 7. Chuyển đổi tiền tệ (Multi-currency Conversion)
- **Status:** ⏳ Pending
- **Priority:** Medium
- **Estimated Time:** 3-4 days
- **Dependencies:** Wallet model (đã có currency field)

**Mô tả:**
Hỗ trợ nhiều loại tiền tệ với tỷ giá real-time và tự động chuyển đổi.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `ExchangeRate` trong `backend/app/models.py`
    - Fields: `id`, `from_currency`, `to_currency`, `rate`, `date`, `source`
  - [ ] Tạo service `backend/app/utils/currency_converter.py`
    - Tích hợp API tỷ giá (ví dụ: exchangerate-api.com, fixer.io)
    - Cache tỷ giá
    - Tự động update tỷ giá hàng ngày
  - [ ] Tạo API endpoints trong `backend/app/api/currency.py`
    - `GET /api/currency/rates` - Lấy tỷ giá
    - `POST /api/currency/convert` - Chuyển đổi
    - `GET /api/currency/supported` - Danh sách tiền tệ hỗ trợ
  - [ ] Cập nhật Dashboard API để convert về một currency
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Component currency selector trong wallet form
  - [ ] Hiển thị tỷ giá trong wallet list
  - [ ] Converter tool trong Settings
  - [ ] Cập nhật Dashboard để hiển thị đa tiền tệ
  - [ ] Thêm currency vào expense form
- [ ] **AI Integration:**
  - [ ] AI có thể trả lời về tỷ giá
  - [ ] AI convert currency trong chat

**Notes:**
- Hỗ trợ các currency phổ biến: VND, USD, EUR, JPY, CNY, etc.
- Cache tỷ giá để giảm API calls
- Cho phép set default currency cho user

---

### 🟢 Priority 3 - Tính năng nâng cao

#### 8. Vị trí chi tiêu (Location Tracking)
- **Status:** ⏳ Pending
- **Priority:** Low
- **Estimated Time:** 2-3 days
- **Dependencies:** None

**Mô tả:**
Lưu địa điểm chi tiêu, hiển thị trên bản đồ và thống kê theo khu vực.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Thêm fields vào model `Expense`: `latitude`, `longitude`, `address`, `place_name`
  - [ ] Tạo API endpoints trong `backend/app/api/expenses.py`
    - Cập nhật create/update expense để nhận location
    - `GET /api/expenses/by-location` - Thống kê theo location
  - [ ] Tích hợp geocoding API (Google Maps, OpenStreetMap)
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Component map picker trong expense form
  - [ ] Tích hợp Google Maps hoặc Mapbox
  - [ ] Hiển thị expenses trên map trong Reports
  - [ ] Thống kê chi tiêu theo khu vực
- [ ] **AI Integration:**
  - [ ] AI phân tích chi tiêu theo location
  - [ ] AI đề xuất địa điểm tiết kiệm

**Notes:**
- Cần permission location từ user
- Privacy: không lưu location chính xác nếu user không muốn
- Có thể dùng approximate location (city/district)

---

#### 9. Mẫu giao dịch (Expense Templates)
- **Status:** ⏳ Pending
- **Priority:** Low
- **Estimated Time:** 2 days
- **Dependencies:** None

**Mô tả:**
Tạo mẫu cho các giao dịch thường dùng để thêm nhanh.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `ExpenseTemplate` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `name`, `amount`, `category`, `description`, `wallet_id`, `is_expense`, `icon`, `created_at`, `updated_at`
  - [ ] Tạo API endpoints trong `backend/app/api/templates.py`
    - `GET /api/templates` - Danh sách templates
    - `POST /api/templates` - Tạo template
    - `PUT /api/templates/<id>` - Cập nhật
    - `DELETE /api/templates/<id>` - Xóa
    - `POST /api/templates/<id>/use` - Sử dụng template để tạo expense
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Component template selector trong expense form
  - [ ] Tạo page `frontend/src/pages/Templates.jsx`
  - [ ] Quick add từ template trong Dashboard
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI đề xuất tạo template từ expense thường xuyên

**Notes:**
- Tự động đề xuất template từ expense history
- Có thể tạo template từ expense hiện có

---

#### 10. Dự báo dòng tiền (Cash Flow Forecasting)
- **Status:** ⏳ Pending
- **Priority:** Medium
- **Estimated Time:** 4-5 days
- **Dependencies:** Recurring Transactions, ExpensePredictor (đã có)

**Mô tả:**
Dự báo thu chi trong tương lai, cảnh báo thiếu tiền và kế hoạch tài chính.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `Forecast` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `period_start`, `period_end`, `forecast_data` (JSON), `created_at`
  - [ ] Tạo service `backend/app/utils/forecaster.py`
    - Sử dụng ExpensePredictor hiện có
    - Tính toán dựa trên recurring transactions
    - Phân tích xu hướng lịch sử
  - [ ] Tạo API endpoints trong `backend/app/api/forecast.py`
    - `GET /api/forecast` - Lấy dự báo
    - `GET /api/forecast/next-month` - Dự báo tháng tới
    - `GET /api/forecast/alerts` - Cảnh báo thiếu tiền
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Tạo page `frontend/src/pages/Forecast.jsx`
  - [ ] Component hiển thị forecast chart
  - [ ] Timeline view cho forecast
  - [ ] Cảnh báo thiếu tiền
  - [ ] Tích hợp vào Dashboard
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI phân tích forecast và đưa ra lời khuyên
  - [ ] AI đề xuất điều chỉnh chi tiêu

**Notes:**
- Dựa trên lịch sử 3-6 tháng
- Tính đến recurring transactions
- Cảnh báo khi dự kiến thiếu tiền

---

#### 11. Chia sẻ gia đình/Nhóm (Family/Group Sharing)
- **Status:** ⏳ Pending
- **Priority:** Low
- **Estimated Time:** 5-6 days
- **Dependencies:** None

**Mô tả:**
Tài khoản gia đình, chia sẻ ngân sách và báo cáo chung.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `Family` trong `backend/app/models.py`
    - Fields: `id`, `name`, `created_by`, `created_at`
  - [ ] Tạo model `FamilyMember` để quản lý thành viên
    - Fields: `id`, `family_id`, `user_id`, `role` (owner/member), `joined_at`
  - [ ] Tạo model `SharedBudget` để chia sẻ ngân sách
    - Fields: `id`, `family_id`, `category`, `amount`, `month`, `year`
  - [ ] Tạo API endpoints trong `backend/app/api/family.py`
    - `GET /api/family` - Thông tin family
    - `POST /api/family` - Tạo family
    - `POST /api/family/invite` - Mời thành viên
    - `GET /api/family/members` - Danh sách thành viên
    - `GET /api/family/shared-budgets` - Ngân sách chung
    - `GET /api/family/reports` - Báo cáo chung
  - [ ] Permission system cho family
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Tạo page `frontend/src/pages/Family.jsx`
  - [ ] Component quản lý family
  - [ ] Form mời thành viên
  - [ ] Hiển thị shared budgets
  - [ ] Báo cáo family
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI phân tích chi tiêu gia đình
  - [ ] AI đề xuất ngân sách chung

**Notes:**
- Cần hệ thống invitation
- Privacy: mỗi user chỉ thấy expense của mình, trừ khi share
- Có thể set permission level

---

#### 12. Sao lưu dữ liệu (Data Backup)
- **Status:** ⏳ Pending
- **Priority:** Medium
- **Estimated Time:** 2-3 days
- **Dependencies:** Export feature (đã có)

**Mô tả:**
Export/import dữ liệu, đồng bộ cloud và khôi phục.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo API endpoints trong `backend/app/api/backup.py`
    - `POST /api/backup/export` - Export toàn bộ dữ liệu (JSON)
    - `POST /api/backup/import` - Import dữ liệu
    - `GET /api/backup/history` - Lịch sử backup
    - `POST /api/backup/cloud-sync` - Đồng bộ cloud (nếu có)
  - [ ] Tạo service `backend/app/utils/backup.py`
    - Export: User, Expenses, Wallets, Budgets, Goals, etc.
    - Import: Validate và import dữ liệu
    - Version control cho backup
  - [ ] Tích hợp cloud storage (Google Drive, Dropbox) - optional
- [ ] **Frontend:**
  - [ ] Tạo page `frontend/src/pages/Backup.jsx` trong Settings
  - [ ] Button export data
  - [ ] Button import data với file picker
  - [ ] Hiển thị lịch sử backup
  - [ ] Auto-backup settings
- [ ] **AI Integration:**
  - [ ] AI nhắc nhở backup định kỳ

**Notes:**
- Export format: JSON hoặc encrypted
- Validate dữ liệu khi import
- Có thể schedule auto-backup

---

#### 13. Theo dõi đầu tư (Investment Tracking)
- **Status:** ⏳ Pending
- **Priority:** Low
- **Estimated Time:** 4-5 days
- **Dependencies:** None

**Mô tả:**
Quản lý portfolio đầu tư, theo dõi lãi/lỗ và phân tích ROI.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `Investment` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `name`, `type` (stock/crypto/bond/real-estate), `amount`, `current_value`, `purchase_date`, `quantity`, `price_per_unit`, `current_price`, `wallet_id`, `notes`, `created_at`, `updated_at`
  - [ ] Tạo model `InvestmentTransaction` để track buy/sell
    - Fields: `id`, `investment_id`, `type` (buy/sell/dividend), `amount`, `quantity`, `price`, `date`, `notes`
  - [ ] Tạo API endpoints trong `backend/app/api/investments.py`
    - `GET /api/investments` - Danh sách investments
    - `POST /api/investments` - Tạo mới
    - `PUT /api/investments/<id>` - Cập nhật
    - `DELETE /api/investments/<id>` - Xóa
    - `GET /api/investments/<id>/performance` - Hiệu suất
    - `GET /api/investments/portfolio` - Tổng quan portfolio
  - [ ] Tích hợp API giá (nếu có) để update current price
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Tạo page `frontend/src/pages/Investments.jsx`
  - [ ] Component hiển thị portfolio
  - [ ] Form thêm/chỉnh sửa investment
  - [ ] Chart hiển thị performance
  - [ ] Tính toán ROI, profit/loss
  - [ ] Tích hợp vào Dashboard
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI phân tích portfolio
  - [ ] AI đưa ra lời khuyên đầu tư

**Notes:**
- Hỗ trợ nhiều loại đầu tư
- Tự động update giá (nếu có API)
- Tính toán lãi/lỗ theo thời gian thực

---

#### 14. Thẻ/Tags cho chi tiêu
- **Status:** ⏳ Pending
- **Priority:** Low
- **Estimated Time:** 2-3 days
- **Dependencies:** None

**Mô tả:**
Gắn nhiều tag cho expense, lọc và thống kê theo tag.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Tạo model `Tag` trong `backend/app/models.py`
    - Fields: `id`, `user_id`, `name`, `color`, `created_at`
  - [ ] Tạo model `ExpenseTag` (many-to-many)
    - Fields: `id`, `expense_id`, `tag_id`
  - [ ] Tạo API endpoints trong `backend/app/api/tags.py`
    - `GET /api/tags` - Danh sách tags
    - `POST /api/tags` - Tạo tag
    - `PUT /api/tags/<id>` - Cập nhật
    - `DELETE /api/tags/<id>` - Xóa
    - `GET /api/tags/<id>/expenses` - Expenses có tag này
  - [ ] Cập nhật Expense API để hỗ trợ tags
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Component tag selector trong expense form
  - [ ] Tạo page `frontend/src/pages/Tags.jsx`
  - [ ] Hiển thị tags trong expense list
  - [ ] Filter expenses theo tag
  - [ ] Thống kê theo tag
  - [ ] Thêm route và navigation
- [ ] **AI Integration:**
  - [ ] AI đề xuất tag từ description
  - [ ] AI phân tích chi tiêu theo tag

**Notes:**
- Mỗi expense có thể có nhiều tags
- Tự động đề xuất tag từ category
- Có thể tạo tag nhanh từ expense form

---

#### 15. Mục tiêu tài chính dài hạn (Long-term Financial Goals)
- **Status:** ⏳ Pending
- **Priority:** Low
- **Estimated Time:** 3-4 days
- **Dependencies:** Savings Goals (có thể mở rộng)

**Mô tả:**
Kế hoạch tài chính dài hạn như mua nhà, nghỉ hưu, giáo dục con.

**Kế hoạch triển khai:**
- [ ] **Backend:**
  - [ ] Mở rộng model `SavingsGoal` hoặc tạo `FinancialGoal`
    - Thêm fields: `goal_type` (short-term/long-term), `milestones` (JSON), `timeline_years`
  - [ ] Tạo model `Milestone` để track các mốc
    - Fields: `id`, `goal_id`, `name`, `target_date`, `target_amount`, `achieved`, `achieved_date`
  - [ ] Tạo API endpoints trong `backend/app/api/goals.py`
    - Mở rộng endpoints hiện có
    - `GET /api/goals/long-term` - Mục tiêu dài hạn
    - `POST /api/goals/<id>/milestones` - Thêm milestone
  - [ ] Migration database
- [ ] **Frontend:**
  - [ ] Mở rộng Goals page để hỗ trợ long-term goals
  - [ ] Component timeline view cho goals
  - [ ] Milestone tracker
  - [ ] Projection chart (dự kiến đạt mục tiêu khi nào)
  - [ ] Tích hợp vào Dashboard
- [ ] **AI Integration:**
  - [ ] AI tư vấn kế hoạch tài chính dài hạn
  - [ ] AI tính toán cần tiết kiệm bao nhiêu mỗi tháng

**Notes:**
- Khác với Savings Goals ngắn hạn
- Cần tính toán phức tạp hơn (lạm phát, lãi suất)
- Có thể chia thành nhiều milestones

---

## 📝 Notes chung

### Công nghệ cần bổ sung
- **Background Jobs:** APScheduler hoặc Celery cho recurring transactions
- **File Storage:** Local storage hoặc cloud (AWS S3, Google Cloud Storage)
- **Geocoding API:** Google Maps API hoặc OpenStreetMap
- **Currency API:** exchangerate-api.com hoặc fixer.io
- **Image Processing:** Pillow cho resize/compress ảnh

### Database Migrations
- Tất cả tính năng mới cần migration
- Sử dụng Flask-Migrate hoặc Alembic
- Backup database trước khi migrate

### Testing
- Unit tests cho mỗi tính năng
- Integration tests cho API
- Frontend tests cho components

### Documentation
- API documentation (Swagger/OpenAPI)
- User guide cho mỗi tính năng
- Developer guide cho contributors

---

## 🎯 Roadmap đề xuất

### Phase 1 (Tháng 1-2)
1. Savings Goals
2. Recurring Transactions
3. Debt Tracking

### Phase 2 (Tháng 3-4)
4. Bill Reminders
5. Expense Splitting
6. Receipt Gallery

### Phase 3 (Tháng 5-6)
7. Multi-currency
8. Location Tracking
9. Expense Templates
10. Cash Flow Forecasting

### Phase 4 (Tháng 7+)
11. Family Sharing
12. Data Backup
13. Investment Tracking
14. Tags
15. Long-term Goals

---

## 📊 Tracking Progress

Cập nhật status khi bắt đầu/hoàn thành:
- ⏳ Pending - Chưa bắt đầu
- 🚧 In Progress - Đang phát triển
- ✅ Completed - Đã hoàn thành
- ❌ Cancelled - Đã hủy

---

**Last Updated:** 2025-02-19

---

## 📝 Tình trạng hiện tại (Updated: 2025-02-19)

### ✅ Đã hoàn thành phần Backend:
1. **Savings Goals (Mục tiêu tiết kiệm)**
   - ✅ Model `SavingsGoal` đã được tạo với đầy đủ fields
   - ✅ API endpoints đầy đủ trong `backend/app/api/goals.py`
   - ✅ Notification khi đạt mục tiêu
   - ✅ API client đã có trong frontend
   - ✅ Chat command `/goal` đã có trong frontend

### ✅ Đã hoàn thành:
1. **Savings Goals (Mục tiêu tiết kiệm)**
   - ✅ Page `Goals.jsx` đã tạo
   - ✅ Route trong `App.jsx` đã thêm
   - ✅ Navigation link trong `Layout.jsx` đã thêm (desktop & mobile)
   - ✅ Tích hợp vào Dashboard để hiển thị active goals
   - ✅ Form tạo/chỉnh sửa mục tiêu với icon và color picker
   - ✅ Modal thêm tiền vào mục tiêu
   - ✅ Hiển thị progress bar và thống kê

2. **Recurring Transactions (Giao dịch định kỳ)**
   - ✅ Model `RecurringTransaction` đã tạo với đầy đủ fields và methods
   - ✅ API endpoints đầy đủ trong `backend/app/api/recurring.py`
   - ✅ Background scheduler với APScheduler (chạy daily lúc 2:00 AM)
   - ✅ Page `Recurring.jsx` đã tạo với đầy đủ tính năng
   - ✅ Form tạo/chỉnh sửa với frequency selector (daily/weekly/monthly/yearly)
   - ✅ Hiển thị next due date và days until
   - ✅ Actions: Execute, Skip, Edit, Delete
   - ✅ Tích hợp vào Dashboard để hiển thị upcoming recurring (7 ngày)
   - ✅ Route và navigation đã thêm (desktop & mobile)
   - ✅ API client đã có trong `frontend/src/services/api.js`

3. **Debt Tracking (Quản lý nợ)**
   - ✅ Models `Debt` và `DebtPayment` đã tạo với đầy đủ fields và methods
   - ✅ API endpoints đầy đủ trong `backend/app/api/debts.py`
   - ✅ Migration script trong `backend/migrations/create_debt_tables.py`
   - ✅ Page `Debts.jsx` đã tạo với đầy đủ tính năng
   - ✅ Form tạo/chỉnh sửa nợ với support cho cả lending và owing
   - ✅ Modal ghi nhận thanh toán
   - ✅ Modal xem lịch sử thanh toán
   - ✅ Thống kê: tổng nợ, tổng cho vay, vị thế ròng
   - ✅ Phân loại và hiển thị: Đang nợ / Cho vay / Đã thanh toán
   - ✅ Tích hợp vào Dashboard để hiển thị upcoming debts (7 ngày)
   - ✅ Route và navigation đã thêm (desktop & mobile)
   - ✅ API client đã có trong `frontend/src/services/api.js`

### ⏳ Chưa bắt đầu:
- Tất cả các tính năng khác (4-15) chưa được implement

