import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createWorker, OEM, PSM, Worker as TesseractWorker } from "tesseract.js";
import { configuration } from "../../config/configuration";
import { AppError } from "@shared/errors/AppError";
import { OcrEngineAdapter } from "./ocr-engine.adapter";

@Injectable()
export class TesseractOcrEngineAdapter
  implements OcrEngineAdapter, OnModuleDestroy {
  private readonly logger = new Logger(TesseractOcrEngineAdapter.name);
  private worker: TesseractWorker | null = null;
  private is_ready = false;
  private readonly lang: string;
  private readonly tesseractConfig: Partial<Tesseract.RecognizeOptions>;

  constructor(
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {
    this.lang = this.appConfig.ocr.lang;
    this.tesseractConfig = {
      // RecognizeOptions like rectangle, etc.
    };
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.log(`Initializing Tesseract with lang: ${this.lang}`);
      this.worker = await createWorker("vie+eng", OEM.DEFAULT, {
        // logger: (m) => this.logger.debug(m),
      });
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

  async recognize(image: Buffer): Promise<any> {
    if (!this.is_ready || !this.worker) {
      this.logger.warn(
        "Tesseract worker not ready, attempting to re-initialize.",
      );
      await this.initialize();
      if (!this.is_ready || !this.worker) {
        throw new AppError(
          "TESSERACT_NOT_INITIALIZED",
          "Tesseract worker could not be initialized.",
          { reason: "TESSERACT_FAILED" },
        );
      }
    }

    try {
      this.logger.log("Starting Tesseract recognition...");
      const {
        data: { text, confidence, blocks },
      } = await this.worker.recognize(image, this.tesseractConfig);

      const lines = [];
      if (blocks) {
        for (const block of blocks) {
          for (const para of block.paragraphs) {
            lines.push(...para.lines);
          }
        }
      }

      this.logger.log(`Tesseract recognition finished. Confidence: ${confidence}`);
      return { text, confidence, lines };
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
