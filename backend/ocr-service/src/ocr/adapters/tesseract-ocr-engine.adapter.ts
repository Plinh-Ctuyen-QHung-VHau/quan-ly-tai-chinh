import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createWorker, OEM, PSM, Worker as TesseractWorker } from "tesseract.js";
import { configuration } from "../../config/configuration";
import { AppError } from "@shared/errors/AppError";
import { OcrEngineAdapter, OcrEngineResult, OcrLine, OcrWord } from "./ocr-engine.adapter";

@Injectable()
export class TesseractOcrEngineAdapter
  implements OcrEngineAdapter, OnModuleDestroy {
  readonly name = "tesseract" as const;
  private readonly logger = new Logger(TesseractOcrEngineAdapter.name);
  private worker: TesseractWorker | null = null;
  private is_ready = false;
  private readonly lang: string;

  constructor(
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {
    this.lang = this.appConfig.ocr.lang;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.log(`Initializing Tesseract with lang: ${this.lang}`);
      this.worker = await createWorker("vie+eng", OEM.DEFAULT, {});
      await this.worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      this.is_ready = true;
      this.logger.log("Tesseract worker initialized successfully.");
    } catch (error) {
      this.logger.error("Failed to initialize Tesseract worker", error);
      this.is_ready = false;
    }
  }

  async recognize(image: Buffer): Promise<OcrEngineResult> {
    if (!this.is_ready || !this.worker) {
      this.logger.warn("Tesseract worker not ready, attempting to re-initialize.");
      await this.initialize();
      if (!this.is_ready || !this.worker) {
        throw new AppError(
          "TESSERACT_NOT_INITIALIZED",
          "Tesseract worker could not be initialized.",
          { reason: "TESSERACT_FAILED" },
        );
      }
    }

    const t0 = Date.now();
    try {
      this.logger.log("Starting Tesseract recognition...");
      const { data: { text, confidence, blocks } } = await this.worker.recognize(image);

      // Map Tesseract blocks → paragraphs → lines → words into OcrLine[]
      const lines: OcrLine[] = [];
      if (blocks) {
        for (const block of blocks) {
          for (const para of block.paragraphs) {
            for (const line of para.lines) {
              const words: OcrWord[] = (line.words || []).map((w: any) => ({
                text: w.text,
                confidence: w.confidence ?? 0,
                bbox: w.bbox ? { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 } : undefined,
              }));
              lines.push({
                text: line.text,
                confidence: line.confidence ?? 0,
                words,
                bbox: line.bbox ? { x0: line.bbox.x0, y0: line.bbox.y0, x1: line.bbox.x1, y1: line.bbox.y1 } : undefined,
              });
            }
          }
        }
      }

      const durationMs = Date.now() - t0;
      this.logger.log(`Tesseract done in ${durationMs}ms, confidence: ${confidence}`);

      return {
        engine: "tesseract",
        language: this.lang,
        rawText: text,
        lines,
        confidence: confidence ?? 0,
        durationMs,
        warnings: [],
      };
    } catch (error) {
      this.logger.error("Tesseract recognition failed", error);
      throw new AppError(
        "OCR_PROCESSING_FAILED",
        "Tesseract failed to process the image.",
        { reason: "TESSERACT_FAILED", originalError: error.message },
      );
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.logger.log("Tesseract worker terminated.");
      this.is_ready = false;
    }
  }

  async onModuleDestroy() {
    await this.terminate();
  }
}
