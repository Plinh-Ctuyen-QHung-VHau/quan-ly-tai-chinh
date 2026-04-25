import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createWorker, Worker } from "tesseract.js";
import { configuration } from "../../config/configuration";
import { AppError } from "@shared/errors/AppError";
import { OcrEngineAdapter, OcrResult } from "./ocr-engine.adapter";

@Injectable()
export class TesseractOcrEngineAdapter
  implements OcrEngineAdapter, OnModuleDestroy
{
  private readonly logger = new Logger(TesseractOcrEngineAdapter.name);
  private worker: Worker | null = null;
  private workerInitPromise: Promise<void> | null = null;

  constructor(
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async onModuleDestroy() {
    await this.terminateWorker();
  }

  private async initializeWorker(): Promise<void> {
    if (this.worker) {
      return;
    }

    this.logger.log("Initializing Tesseract worker...");
    try {
      const worker = await createWorker({
        logger: (m) => {
          if (m.status === "recognizing text") {
            const progress = (m.progress * 100).toFixed(2);
            this.logger.debug(`Tesseract progress: ${progress}%`);
          }
        },
      });
      await worker.loadLanguage(this.appConfig.ocr.lang);
      await worker.initialize(this.appConfig.ocr.lang);
      this.worker = worker;
      this.logger.log("Tesseract worker initialized successfully.");
    } catch (error) {
      this.logger.error("Failed to initialize Tesseract worker", error.stack);
      this.workerInitPromise = null; // Reset promise to allow re-initialization
      throw new AppError(
        "OCR_PROCESSING_FAILED",
        "Failed to initialize Tesseract worker.",
        {
          reason: "LANGUAGE_DATA_LOAD_FAILED",
          originalError: error.message,
        },
      );
    }
  }

  private async getWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    if (!this.workerInitPromise) {
      this.workerInitPromise = this.initializeWorker();
    }

    await this.workerInitPromise;
    return this.worker!;
  }

  private async terminateWorker() {
    if (this.worker) {
      this.logger.log("Terminating Tesseract worker...");
      await this.worker.terminate();
      this.worker = null;
      this.workerInitPromise = null;
      this.logger.log("Tesseract worker terminated.");
    }
  }

  async recognize(image: Buffer): Promise<OcrResult> {
    try {
      const worker = await this.getWorker();
      const {
        data: { text, confidence },
      } = await worker.recognize(image);
      return { text, confidence };
    } catch (error) {
      this.logger.error("Tesseract recognition failed", error.stack);
      // Terminate the potentially corrupted worker so it can be re-initialized
      await this.terminateWorker();
      throw new AppError(
        "OCR_PROCESSING_FAILED",
        "Tesseract recognition failed.",
        {
          reason: "TESSERACT_FAILED",
          originalError: error.message,
        },
      );
    }
  }
}
