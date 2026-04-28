import { Injectable } from "@nestjs/common";
import { OcrEngineAdapter } from "./ocr-engine.adapter";

@Injectable()
export class MockOcrEngineAdapter implements OcrEngineAdapter {
  async recognize(imageBuffer: Buffer): Promise<any> {
    return Promise.resolve({
      text: "This is mock OCR text from a receipt.",
      confidence: 100,
      lines: []
    });
  }
}
