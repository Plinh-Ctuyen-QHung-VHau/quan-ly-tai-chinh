export const OCR_ENGINE_ADAPTER = "OcrEngineAdapter";

export interface OcrEngineResult {
  text: string;
  confidence: number;
  lines: any[];
}

export interface OcrEngineAdapter {
  recognize(imageBuffer: Buffer): Promise<OcrEngineResult>;
}
