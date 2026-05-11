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
      this.logger.log(`Đang khởi tạo Tesseract với ngôn ngữ: ${this.lang}`);
      this.worker = await createWorker("vie+eng", OEM.DEFAULT, {});
      await this.worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      this.is_ready = true;
      this.logger.log("Khởi tạo Tesseract thành công.");
    } catch (error) {
      this.logger.error("Lỗi: Không thể khởi tạo Tesseract worker", error);
      this.is_ready = false;
    }
  }

  async recognize(image: Buffer): Promise<OcrEngineResult> {
    if (!this.is_ready || !this.worker) {
      this.logger.warn("Tesseract worker chưa sẵn sàng, đang thử khởi tạo lại...");
      await this.initialize();
      if (!this.is_ready || !this.worker) {
        throw new AppError(
          "TESSERACT_NOT_INITIALIZED",
          "Hệ thống đọc ảnh đang bận, vui lòng thử lại sau.",
          { reason: "TESSERACT_FAILED" },
        );
      }
    }

    const t0 = Date.now();
    try {
      this.logger.log("Bắt đầu chạy Tesseract để đọc chữ...");
      const { data: { text, confidence, blocks } } = await this.worker.recognize(image);


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
      this.logger.log(`Tesseract đọc xong trong ${durationMs}ms, độ tin cậy: ${confidence}`);

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
      this.logger.error("Tesseract không đọc được ảnh này", error);
      throw new AppError(
        "OCR_PROCESSING_FAILED",
        "Có lỗi khi xử lý ảnh, bạn gửi lại ảnh khác giúp mình nhé.",
        { reason: "TESSERACT_FAILED", originalError: error.message },
      );
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.logger.log("Đã tắt Tesseract worker.");
      this.is_ready = false;
    }
  }

  async onModuleDestroy() {
    await this.terminate();
  }
}
