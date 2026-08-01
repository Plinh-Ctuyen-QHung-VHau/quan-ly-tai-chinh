# Quản Lý Tài Chính Cá Nhân Thông Minh Tích Hợp AI/NLP

Ứng dụng di động hỗ trợ quản lý thu chi cá nhân, tích hợp OCR nhận diện hóa đơn, chatbot tài chính và phát hiện chi tiêu bất thường.

## Điểm nổi bật

- Quản lý giao dịch, danh mục và ngân sách cá nhân
- OCR trích xuất dữ liệu từ ảnh hóa đơn
- Chatbot hỗ trợ truy vấn và phân tích tài chính
- Phát hiện các khoản chi tiêu bất thường
- Dashboard giám sát bằng Prometheus và Grafana

## Kiến trúc

Hệ thống microservices triển khai bằng Docker Compose, sử dụng Supabase cho PostgreSQL và xác thực.

| Service | Port | Trách nhiệm |
|---|---:|---|
| API Gateway | 3000 | Xác thực JWT và định tuyến request |
| Identity Service | 3001 | Hồ sơ và cài đặt người dùng |
| Transaction Service | 3002 | Giao dịch, danh mục và lịch sử thu chi |
| OCR Service | 3003 | Nhận diện dữ liệu hóa đơn |
| Budget & Notification Service | 3004 | Ngân sách và thông báo |
| Finance Intelligence Service | 3006 | Chatbot và phát hiện bất thường |
| Prometheus | 9090 | Thu thập metrics |
| Grafana | 3005 | Dashboard giám sát |

## Công nghệ

- **Mobile:** React Native, Expo, Zustand
- **Backend:** NestJS, TypeScript
- **Database & Auth:** Supabase PostgreSQL
- **AI:** Google Gemini API
- **OCR:** Tesseract.js, Sharp
- **Infrastructure:** Docker, Docker Compose, Prometheus, Grafana

## Chạy thử

1. Tạo các file môi trường từ template và điền credential của riêng bạn. Không commit token hoặc mật khẩu.
2. Khởi động backend:

```bash
cd backend
docker compose up --build -d
```

3. Cấu hình frontend:

```env
EXPO_PUBLIC_API_BASE_URL=<YOUR_BACKEND_URL>
```

4. Khởi động Expo:

```bash
cd frontend
npm install
npx expo start -c --tunnel
```

Tài khoản thử nghiệm được cung cấp riêng theo yêu cầu; repository công khai không lưu thông tin đăng nhập.

## Demo

[Video và tài liệu demo](https://drive.google.com/drive/u/0/folders/1DmiLFqAQDG6AMn9rlcI195tgFObR39Mf)

## Nhóm thực hiện

Đồ án chuyên ngành — Khoa CNTT, Trường Đại học Sài Gòn  
GVHD: PGS. TS. Nguyễn Tuấn Đăng

- Trương Văn Hậu
- Nguyễn Quốc Hùng ([@nqhung212](https://github.com/nqhung212))
- Lý Phúc Linh
- Nguyễn Công Tuyển
  
