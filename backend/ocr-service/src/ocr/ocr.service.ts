import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { AppError } from "../shared/errors/AppError";
import { StorageReader } from "../storage/storage.reader";
import { OcrEngineAdapter } from "./adapters/ocr-engine.adapter";
import { ScanImageDto } from "./dto/scan-image.dto";
import { OcrParser } from "./ocr.parser";
import { OcrRepository } from "./ocr.repository";
import { configuration } from "../config/configuration";
import { AppMetrics } from "../metrics/app.metrics";
import { ImagePreprocessorService } from "./image-preprocessor.service";
import { race, firstValueFrom, throwError, timer } from "rxjs";
import { catchError, map } from "rxjs/operators";

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly ocrRepository: OcrRepository,
    private readonly storageReader: StorageReader,
    private readonly ocrEngine: OcrEngineAdapter,
    private readonly ocrParser: OcrParser,
    private readonly metrics: AppMetrics,
    private readonly imagePreprocessor: ImagePreprocessorService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async scan(userId: string, scanImageDto: ScanImageDto) {
    this.metrics.ocrRequestsTotal.inc();
    const startTime = Date.now();

    const { imageUrl, storagePath } = scanImageDto;
    const path = storagePath || this.storageReader.getPathFromUrl(imageUrl);

    const ocrRequest = await this.ocrRepository.createRequest({
      userId,
      imageUrl,
      storagePath: path,
    });

    try {
      const ocrPromise = this.performOcr(path);

      const timeout$ = timer(this.appConfig.ocr.timeoutMs).pipe(
        map(() => {
          throw new AppError(
            "OCR_PROCESSING_FAILED",
            "OCR process timed out.",
            { reason: "OCR_TIMEOUT" },
          );
        }),
      );

      const result = await firstValueFrom(
        race(ocrPromise, timeout$).pipe(
          catchError((err) => throwError(() => err)),
        ),
      );

      const finalResult = await this.ocrRepository.createResult({
        requestId: ocrRequest.id,
        userId,
        ...result,
      });

      await this.ocrRepository.updateRequestStatus(ocrRequest.id, "processed");
      this.metrics.ocrSuccessTotal.inc();
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.ocrProcessingDurationSeconds.observe(duration);

      return {
        ocrRequestId: finalResult.requestId,
        ocrResultId: finalResult.id,
        imageUrl,
        ...finalResult,
      };
    } catch (error) {
      this.logger.error(
        `OCR scanning failed for request ${ocrRequest.id}`,
        error,
      );

      if (error.details?.reason === "OCR_TIMEOUT") {
        this.metrics.ocrTimeoutTotal.inc();
      }
      if (error.details?.reason === "TESSERACT_FAILED") {
        this.metrics.ocrEngineErrorsTotal.inc();
      }

      await this.ocrRepository.updateRequestStatus(ocrRequest.id, "failed", {
        error: error.message,
        reason: error.details?.reason,
      });

      this.metrics.ocrFailuresTotal.inc();
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.ocrProcessingDurationSeconds.observe(duration);

      throw error; // Re-throw the original AppError
    }
  }

  private async performOcr(path: string) {
    let imageBuffer: Buffer;
    try {
      this.logger.log(`Reading image from storage: ${path}`);
      imageBuffer = await this.storageReader.read(path);
    } catch (error) {
      throw new AppError(
        "OCR_PROCESSING_FAILED",
        "Failed to read image from storage.",
        { reason: "STORAGE_READ_FAILED", originalError: error.message },
      );
    }

    const processedBuffer = await this.imagePreprocessor.process(imageBuffer);

    this.logger.log("Processing image with OCR engine...");
    const ocrResult = await this.ocrEngine.recognize(processedBuffer);

    this.logger.log("Parsing OCR text...");
    const parsedData = this.ocrParser.parse(
      ocrResult.text,
      this.appConfig.ocr.engine,
      this.appConfig.ocr.lang,
    );

    return {
      extractedText: ocrResult.text,
      confidenceScore: ocrResult.confidence,
      ...parsedData,
    };
  }

  async getResult(id: string, userId: string) {
    const result = await this.ocrRepository.findResultById(id, userId);
    if (!result) {
      throw new AppError("NOT_FOUND", `OCR result with ID ${id} not found.`);
    }
    return result;
  }

  async retry(id: string, userId: string) {
    const originalRequest = await this.ocrRepository.findRequestById(
      id,
      userId,
    );
    if (!originalRequest) {
      throw new AppError("NOT_FOUND", `OCR request with ID ${id} not found.`);
    }

    // Rescan using the original image path/url
    return this.scan(userId, {
      imageUrl: originalRequest.imageUrl,
      storagePath: originalRequest.storagePath,
    });
  }
}
