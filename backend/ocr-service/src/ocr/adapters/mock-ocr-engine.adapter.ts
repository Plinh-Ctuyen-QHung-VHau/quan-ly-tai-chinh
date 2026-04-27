import { Injectable } from "@nestjs/common";
import { OcrEngineAdapter } from "./ocr-engine.adapter";

@Injectable()
export class MockOcrEngineAdapter implements OcrEngineAdapter {
  async recognize(imageBuffer: Buffer): Promise<string> {
    return Promise.resolve("This is mock OCR text from a receipt.");
  }
}
