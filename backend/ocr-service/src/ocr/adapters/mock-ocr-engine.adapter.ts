import { Injectable } from "@nestjs/common";
import { OcrEngineAdapter, OcrEngineResult } from "./ocr-engine.adapter";

@Injectable()
export class MockOcrEngineAdapter implements OcrEngineAdapter {
  readonly name = "tesseract" as const; // pretend to be tesseract for compatibility

  async recognize(_imageBuffer: Buffer): Promise<OcrEngineResult> {
    return {
      engine: "tesseract",
      language: "vie+eng",
      rawText: "This is mock OCR text from a receipt.",
      confidence: 100,
      lines: [],
      warnings: [],
    };
  }
}
