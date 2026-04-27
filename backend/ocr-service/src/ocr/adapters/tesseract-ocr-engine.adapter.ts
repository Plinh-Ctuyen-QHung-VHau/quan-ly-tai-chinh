import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createWorker, OEM, Worker as TesseractWorker } from "tesseract.js";
import { configuration } from "../../config/configuration";
import { AppError } from "@shared/errors/AppError";
import { OcrEngineAdapter } from "./ocr-engine.adapter";

@Injectable()
export class TesseractOcrEngineAdapter
  implements OcrEngineAdapter, OnModuleDestroy
{
  private readonly logger = new Logger(TesseractOcrEngineAdapter.name);
  private worker: TesseractWorker | null = null;
  private isReady = false;
  private readonly lang: string;
  private readonly tesseractConfig: Partial<Tesseract.RecognizeOptions>;

  constructor(
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {
    this.lang = this.appConfig.ocr.lang;
    this.tesseractConfig = {
      // Tesseract parameters can be configured here
    };
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.logger.log(`Initializing Tesseract with lang: ${this.lang}`);
      this.worker = await createWorker(this.lang, OEM.DEFAULT, {
        // logger: (m) => this.logger.debug(m), // Uncomment for verbose logging
      });
      this.isReady = true;
      this.logger.log("Tesseract worker initialized successfully.");
    } catch (error) {
      this.logger.error("Failed to initialize Tesseract worker", error);
      this.isReady = false;
    }
  }

  async recognize(image: Buffer): Promise<string> {
    if (!this.isReady || !this.worker) {
      this.logger.warn(
        "Tesseract worker not ready, attempting to re-initialize.",
      );
      await this.initialize();
      if (!this.isReady || !this.worker) {
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
        data: { text },
      } = await this.worker.recognize(image, this.tesseractConfig);
      this.logger.log("Tesseract recognition finished.");
      return text;
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
      this.isReady = false;
    }
  }

  async onModuleDestroy() {
    await this.terminate();
  }
}
