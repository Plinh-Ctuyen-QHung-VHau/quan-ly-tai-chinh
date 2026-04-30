import { Injectable, Logger } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Types ───────────────────────────────────────────────────────────

export interface ParsedOcrResult {
  extracted_text: string;
  suggested_amount: number | null;
  suggested_date: Date | null;
  suggested_type: "income" | "expense" | null;
  suggested_category_id: string | null;
  merchant_name: string | null;
  confidence_score: number | null;
  parsed_fields_json: Record<string, any>;
}

// ─── Parser ──────────────────────────────────────────────────────────

@Injectable()
export class OcrParser {
  private readonly logger = new Logger(OcrParser.name);

  async parse(
    rawText: string,
    ocrData: any,
    ocrEngine: string,
    ocrLanguage: string,
  ): Promise<ParsedOcrResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please configure it in .env file.");
    }
    return await this.parseWithGemini(rawText, ocrData, ocrEngine, ocrLanguage, apiKey);
  }

  async parseWithGemini(
    rawText: string,
    ocrData: any,
    ocrEngine: string,
    ocrLanguage: string,
    apiKey: string
  ): Promise<ParsedOcrResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const fallbackModels = [
      "gemini-3.1-flash-lite-preview",
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
      "gemini-2.5-flash-lite"
    ];

    const prompt = `Bạn là chuyên gia OCR Parser cho ứng dụng Quản lý Tài chính cá nhân tại Việt Nam.

Nhiệm vụ:
Phân tích text OCR và trích xuất thông tin để gợi ý tạo giao dịch.
Chỉ trả về JSON hợp lệ. Không markdown. Không giải thích. Không thêm chữ ngoài JSON.

Text OCR:
"""
${rawText}
"""

Chỉ được trả về JSON đúng cấu trúc sau:
{
  "suggested_amount": <number | null>,
  "suggested_date": <string | null>,
  "suggested_type": <"income" | "expense" | null>,
  "merchant_name": <string | null>,
  "suggested_category_name": <string | null>
}

Danh mục hợp lệ:
- "Ăn uống", "Di chuyển", "Mua sắm", "Điện", "Nước", "Internet", "Y tế", "Học tập", "Giải trí", "Tiền nhà", "Lương", "Thưởng"
- "Chi khác"

QUY TẮC BẮT BUỘC CHUNG:
- Không trả thêm field khác. Không trả text ngoài JSON.
- suggested_amount phải là number.
- suggested_date phải là ISO string timezone Việt Nam +07:00.

====================
1. CHỌN SỐ TIỀN CHÍNH (suggested_amount)
====================
- Chấp nhận lỗi quang học OCR (Khớp mờ): Lường trước các biến thể "Tong cong", "Thanh tien", "Da thanh toan", "Thuc linh".
- Ưu tiên mạnh các keyword: "Tổng cộng", "Tổng tiền", "Thành tiền", "Thanh toán", "Đã thanh toán", "Phải thanh toán", "Số tiền giao dịch", "Total", "Amount due", "Khách đưa", "Tiền mặt", "Chuyển khoản", "Thực lĩnh", "Net salary".
- CÁC ĐỊNH DẠNG TIỀN TỆ CẦN XỬ LÝ VÀ CHUYỂN VỀ SỐ NGUYÊN (number):
  + Tiêu chuẩn: 50000, 50.000, 50,000, 50 000.
  + Kèm tiền tố/hậu tố: 1.200.000đ, 1.200.000 đ, 1,200,000 VND, 1.200.000 VNĐ, 1.200.000 VNÐ, ₫1.200.000.
  + Số thập phân (bỏ phần thập phân): 50.000,00, 50,000.00.
  + Viết tắt (nhân 1000): 50K, 50k (hiểu là 50000).
  + Lỗi dính ký tự quang học: 1'200'000, 1.200.000-, 1.200.000*
- GIỚI HẠN BẤT BIẾN (Tuyệt đối không lấy làm amount):
  + Chuỗi số thập phân có đúng 10 chữ số và bắt đầu bằng số 0.
  + Chuỗi số đi liền với "Mã giao dịch", "Mã tham chiếu".
  + Các giá trị nằm cùng dòng với: "Cộng tiền hàng", "Subtotal", "Tổng chưa thuế", "Thuế GTGT", "VAT", "8%", "10%", "Chiết khấu", "Discount", "Voucher", "Số dư", "Tiền thừa", "Tạm tính".

====================
2. NGÀY GIAO DỊCH (suggested_date)
====================
- CÁC ĐỊNH DẠNG THỜI GIAN CẦN XỬ LÝ:
  + Cấu trúc số: dd/MM/yyyy, d/M/yyyy, dd-MM-yyyy, dd.MM.yyyy, dd\MM\yyyy, yyyy-MM-dd, dd/MM/yy.
  + Cấu trúc văn bản: "Ngày dd tháng MM năm yyyy", "dd thg MM yyyy", "dd thg MM, yyyy".
  + Kèm giờ phút: HH:mm dd/MM/yyyy, dd/MM/yyyy HH:mm, HHh:mm dd/MM/yyyy, HHhmm dd/MM/yyyy.
- Xử lý khuyết thiếu: Ưu tiên ngày thực thi giao dịch. Nếu định dạng thời gian bị thiếu năm (VD: 15/04, 15/04 14:30, 14h30 15/04), BẮT BUỘC tự nội suy năm hiện tại là 2026.
- Định dạng xuất ra chuẩn ISO 8601 kèm múi giờ +07:00 (VD: "2026-04-15T14:30:00+07:00"). Nếu không có giờ, đặt mặc định 00:00:00+07:00.

====================
3. LOẠI GIAO DỊCH (suggested_type)
====================
- "expense" (chi phí): "Tới", "Người nhận", "Chuyển tiền đến", "Tài khoản nhận", "Thanh toán", "Quẹt thẻ", "POS", "Rút tiền mặt".
- "income" (thu nhập): "Giao dịch nhận được","Giao dịch chuyển khoản","Thu nhập","Lương","Bảng lương","Thưởng","Từ", "Người gửi", "Nhận từ", "Ghi có", "Nhận tiền", "Tiền vào", "Hoàn tiền", "Refund", "Trả cổ tức","Học bổng".

====================
4. CHUẨN HÓA THỰC THỂ MERCHANT (merchant_name)
====================
- BẮT BUỘC xóa bỏ: "CÔNG TY TNHH", "CÔNG TY CP", "CÔNG TY CỔ PHẦN", "CTCP", "HKD", "HỘ KINH DOANH", "DNTN", "HTX", "THƯƠNG MẠI DỊCH VỤ", "CHI NHÁNH", "In bởi Vietbill.vn", "HÓA ĐƠN".

====================
5. ĐỊNH TUYẾN DANH MỤC (suggested_category_name)
====================
- Sử dụng merchant_name đã chuẩn hóa làm trọng số cao nhất.
- "Ăn uống": cafe, trà sữa, quán ăn, cơm, Highlands, The Coffee House, Katinat, Phúc Long, Koi Thé, Mixue, KFC, Lotteria, McDonald's, GrabFood, ShopeeFood, BeFood.
- "Mua sắm": Shopee, Lazada, Tiki, TikTok Shop, Vinmart, Winmart, Co.opmart, Bách Hóa Xanh, Go!, BigC, Circle K, GS25, FamilyMart, 7-Eleven, Guardian, Hasaki.
- "Di chuyển": Grab, Be, Gojek, Xanh SM, Vinasun, Taxi, vé xe, xăng, Petrolimex, PVOIL, bãi giữ xe, VETC, ePass, Vietjet, Vietnam Airlines.
- "Điện": EVN, tiền điện. "Nước": tiền nước, cấp nước, Sawaco. "Internet": wifi, FPT, Viettel, VNPT, SCTV.
- "Y tế": bệnh viện, phòng khám, nhà thuốc, Pharmacity, Long Châu, An Khang.
- "Học tập": học phí, nhà sách, Fahasa, khóa học, VUS, ILA, Apollo.
- "Giải trí": cinema, CGV, Lotte Cinema, Steam, karaoke, Netflix, Spotify.
- "Tiền nhà": tiền nhà, thuê nhà, phòng trọ, chung cư, phí quản lý.`;

    let responseText = "";
    let lastError: any = null;

    for (const modelName of fallbackModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log(`[OCR Parser] Trying model: ${modelName}...`);

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          }
        });

        responseText = result.response.text();
        console.log(`[OCR Parser] Successfully used model: ${modelName}`);
        break; // Stop looping if successful
      } catch (error: any) {
        console.warn(`[OCR Parser] Model ${modelName} failed:`, error.message);
        lastError = error;
      }
    }

    if (!responseText) {
      throw lastError || new Error("All fallback models failed due to quota or network issues.");
    }
    const json = JSON.parse(responseText);

    return {
      extracted_text: rawText,
      suggested_amount: json.suggested_amount || null,
      suggested_date: json.suggested_date ? new Date(json.suggested_date) : null,
      suggested_type: json.suggested_type || null,
      suggested_category_id: null,
      merchant_name: json.merchant_name || null,
      confidence_score: 95,
      parsed_fields_json: {
        ocr_engine: ocrEngine,
        ocr_language: ocrLanguage,
        raw_text: rawText,
        selected_amount: { value: json.suggested_amount },
        selected_date: { value: json.suggested_date ? new Date(json.suggested_date) : null },
        suggested_category_name: json.suggested_category_name || null,
        gemini_parsed: true
      }
    };
  }
}
