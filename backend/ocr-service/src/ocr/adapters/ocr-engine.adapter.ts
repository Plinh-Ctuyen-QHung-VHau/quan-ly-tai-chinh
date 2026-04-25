export interface OcrEngineAdapter {
  extractText(imageBuffer: Buffer): Promise<string>;
}

export const OCR_ENGINE_ADAPTER = "OcrEngineAdapter";
