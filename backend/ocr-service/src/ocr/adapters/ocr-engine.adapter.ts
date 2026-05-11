
export const OCR_ENGINE_ADAPTER = "OcrEngineAdapter";

export type OcrWord = {
  text: string;
  confidence: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

export type OcrLine = {
  text: string;
  confidence: number;
  words: OcrWord[];
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

export type OcrEngineResult = {
  engine: "tesseract";
  language: string;
  rawText: string;
  lines: OcrLine[];
  confidence: number;
  preprocessingVariant?: string;
  durationMs?: number;
  warnings: string[];
};

export interface OcrEngineAdapter {
  readonly name: "tesseract";
  recognize(imageBuffer: Buffer): Promise<OcrEngineResult>;
}
