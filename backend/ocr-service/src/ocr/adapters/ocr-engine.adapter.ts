export const OCR_ENGINE_ADAPTER = "OcrEngineAdapter";

export interface OcrEngineAdapter {
  recognize(imageBuffer: Buffer): Promise<string>;
}
