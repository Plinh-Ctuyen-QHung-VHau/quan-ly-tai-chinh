export interface OcrResult {
  text: string;
  confidence: number;
}

export interface OcrEngineAdapter {
  recognize(imageBuffer: Buffer): Promise<OcrResult>;
}

export const OCR_ENGINE_ADAPTER = "OcrEngineAdapter";

