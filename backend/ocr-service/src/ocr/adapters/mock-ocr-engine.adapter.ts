import { Injectable } from "@nestjs/common";
import { OcrEngineAdapter, OcrResult } from "./ocr-engine.adapter";

@Injectable()
export class MockOcrEngineAdapter implements OcrEngineAdapter {
    async recognize(imageBuffer: Buffer): Promise<OcrResult> {
        console.log(
            `[MockOcrEngineAdapter] Received image buffer of size: ${imageBuffer.length} bytes. Simulating OCR...`,
        );

        // Simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        return {
            text: `
        HOÁ ĐƠN THANH TOÁN
        CÀ PHÊ TRUNG NGUYÊN
        Địa chỉ: 123 Nguyễn Huệ, Q.1, TPHCM
        Ngày: 25/04/2026
        
        1. Cà phê sữa đá      35,000 VND
        2. Bạc xỉu             40.000 VND
        
        TỔNG CỘNG: 75,000 VND
        
        Cảm ơn quý khách!
      `,
            confidence: 85,
        };
    }
}
