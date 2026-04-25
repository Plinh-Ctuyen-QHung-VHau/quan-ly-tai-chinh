# Backend Monorepo - Quản lý chi tiêu cá nhân

Backend monorepo cho hệ thống quản lý chi tiêu cá nhân thông minh, xây dựng trên kiến trúc microservices sử dụng NestJS.

## Kiến trúc

Hệ thống bao gồm các services sau:

- **API Gateway**: Điểm vào duy nhất cho tất cả các request từ client. Chịu trách nhiệm routing, xác thực JWT, và rate limiting.
- **Identity Service**: Quản lý thông tin người dùng (profile, settings).
- **Transaction Service**: Quản lý các giao dịch tài chính (thu, chi).
- **OCR Service**: Xử lý nhận dạng ký tự quang học từ ảnh hóa đơn.
- **Budget & Notification Service**: Quản lý ngân sách và gửi thông báo cho người dùng.
- **Shared**: Thư viện dùng chung cho các services (helpers, configs, custom errors,...).

## Công nghệ

- Node.js
- TypeScript
- NestJS
- Docker & Docker Compose
- pnpm (recommended)
- Prometheus & Grafana để giám sát

## Cài đặt

Mỗi service là một project NestJS độc lập. Để cài đặt dependencies cho tất cả các services, bạn có thể chạy lệnh sau từ thư mục `backend`:

```bash
# Dùng pnpm
pnpm install -r

# Hoặc dùng npm (chạy trong từng thư mục service)
cd api-gateway && npm install && cd ..
cd identity-service && npm install && cd ..
# ... lặp lại cho các service khác
```

## Chạy dự án

### 1. Cấu hình môi trường

Mỗi service đều có file `.env.example`. Hãy tạo file `.env` tương ứng cho từng service và điền các giá trị cần thiết.

**Quan trọng:**

- `SUPABASE_JWT_SECRET`: Phải được lấy từ Supabase project settings của bạn.
- Các `SERVICE_URL` phải trỏ đúng đến địa chỉ của các service khác trong mạng Docker.

### 2. Chạy các services

Sử dụng Docker Compose để khởi chạy toàn bộ hệ thống:

```bash
docker-compose up -d
```

Lệnh này sẽ build và chạy các container cho `api-gateway`, `identity-service`, `transaction-service`, `ocr-service`, và `budget-notification-service`.

### 3. Chạy hệ thống giám sát

Để khởi chạy Prometheus và Grafana:

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

- **Prometheus** sẽ có tại: `http://localhost:9090`
- **Grafana** sẽ có tại: `http://localhost:3000`

Prometheus được cấu hình để tự động scrape metrics từ endpoint `/metrics` của tất cả các services.

## Quy trình phát triển

Khi thêm một tính năng mới:

1.  Xác định service chịu trách nhiệm.
2.  Phát triển controller, service, repository trong service đó.
3.  Thêm DTOs để validate input.
4.  Sử dụng các module từ `shared` để đảm bảo tính nhất quán (response format, error handling).
5.  Cập nhật routing ở `api-gateway` nếu cần.
6.  Viết unit test và integration test.
