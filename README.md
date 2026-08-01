# Quản Lý Tài Chính Cá Nhân Thông Minh Tích Hợp AI/NLP

Ứng dụng di động hỗ trợ quản lý thu chi cá nhân, tích hợp OCR nhận diện hóa đơn, chatbot tài chính và phát hiện chi tiêu bất thường.

## Kiến trúc

Hệ thống Microservices triển khai qua Docker Compose, sử dụng Supabase làm cơ sở dữ liệu và xác thực.

| Service | Port | Mô tả |
|---|---|---|
| API Gateway | 3000 | Xác thực JWT, định tuyến request |
| Identity Service | 3001 | Quản lý hồ sơ và cài đặt người dùng |
| Transaction Service | 3002 | CRUD giao dịch, danh mục, lịch sử thu chi |
| OCR Service | 3003 | Nhận diện và trích xuất dữ liệu từ ảnh hóa đơn |
| Budget & Notification Service | 3004 | Quản lý ngân sách, gửi thông báo đẩy |
| Finance Intelligence Service | 3006 | Chatbot AI, phát hiện chi tiêu bất thường |
| Prometheus | 9090 | Thu thập metrics giám sát |
| Grafana | 3005 | Dashboard trực quan hóa |

## Công nghệ

- **Frontend:** React Native, Expo, Zustand
- **Backend:** NestJS, TypeScript
- **Database:** Supabase PostgreSQL
- **AI:** Google Gemini API
- **OCR:** Tesseract.js, Sharp
- **Infrastructure:** Docker, Docker Compose, Prometheus, Grafana

## Hướng dẫn chạy hệ thống

Yêu cầu: 1 máy host chạy cả Backend lẫn Frontend, có tài khoản Ngrok.

**Bước 1 — Triển khai Backend**

Tại thư mục `backend`, mở Terminal 1:

```bash
docker-compose up --build -d
```

Mở Terminal 2, dùng tài khoản Ngrok thứ nhất để mở tunnel cho cổng 3000 và duy trì phiên này xuyên suốt quá trình kiểm thử:

```bash
ngrok http --domain=xbox-aware-deepen.ngrok-free.dev 3000
```

**Bước 2 — Triển khai Frontend**

Tại thư mục `frontend`, mở Terminal 3:

```bash
npm install
```

Cấu hình file `.env`, đặt biến:

```
EXPO_PUBLIC_API_BASE_URL=https://xbox-aware-deepen.ngrok-free.dev
```

Dùng tài khoản Ngrok thứ hai để khởi chạy Expo Tunnel, tránh xung đột giới hạn kết nối với tài khoản đang vận hành Backend:

```powershell
$env:NGROK_AUTHTOKEN="3DRPn22jzgRgEx7SbJSqL6lMvIE_4nP7JwFXQ5FnwmbPqmc2L"
npx expo start -c --tunnel
```

**Bước 3 — Cài ứng dụng lên thiết bị**

Android: Tải và cài trực tiếp file APK tại
https://expo.dev/accounts/hey129/projects/ql-tai-chinh/builds/bc4bd7e3-4322-4402-b795-dca26ade579e

iOS: Sau khi Expo khởi động, dùng Camera iOS quét mã QR hiển thị trong Terminal để mở ứng dụng qua Expo Go.

**Tài khoản thử nghiệm**

```
Email   : truongvanhau0511@gmail.com
Password: 1234567
```

## Demo

https://drive.google.com/drive/u/0/folders/1DmiLFqAQDG6AMn9rlcI195tgFObR39Mf

Đồ án chuyên ngành — Khoa CNTT, Trường Đại học Sài Gòn

GVHD: PGS. TS. Nguyễn Tuấn Đăng

| Họ và tên | MSSV |
|---|---|
| Trương Văn Hậu | 3122411050 |
| Nguyễn Quốc Hùng | 3122411060 |
| Lý Phúc Linh | 3122411111 |
| Nguyễn Công Tuyển | 3122411239 |
  
