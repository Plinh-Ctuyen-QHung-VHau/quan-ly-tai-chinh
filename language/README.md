# Vietnamese OCR Charset

Thư mục này chứa danh sách các ký tự (charset) tiếng Việt dùng để huấn luyện và map token cho mô hình OCR (Optical Character Recognition).

## Mục đích
- Chứa file cấu hình bộ ký tự (ví dụ `vi_char.txt`) để mô hình OCR biết được không gian nhãn (label space) bao gồm những ký tự nào.
- Dùng cho bước mã hoá (encoding) và giải mã (decoding) kết quả dự đoán của AI. Dịch chuyển từ chỉ số (index) của tensor thành chuỗi ký tự text con người đọc được.
- Đảm bảo tính nhất quán (không trùng lặp, đầy đủ ký tự đặc biệt, hoa thường) khi chuyển đổi dữ liệu.
