import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { AppError } from "@shared/errors/AppError";
import { StorageReader } from "../storage/storage.reader";
import {
  OCR_ENGINE_ADAPTER,
  OcrEngineAdapter,
} from "./adapters/ocr-engine.adapter";
import { ScanOcrDto } from "./dto/ocr.dto";
import { OcrParser } from "./ocr.parser";
import { OcrRepository } from "./ocr.repository";
import { configuration } from "../config/configuration";
import { AppMetrics } from "../metrics/app.metrics";
import { ImagePreprocessorService } from "../preprocess/image-preprocessor.service";
import { race, firstValueFrom, throwError, timer, from } from "rxjs";
import { catchError, map } from "rxjs/operators";

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly ocrRepository: OcrRepository,
    private readonly storageReader: StorageReader,
    @Inject(OCR_ENGINE_ADAPTER)
    private readonly ocrEngine: OcrEngineAdapter,
    private readonly ocrParser: OcrParser,
    private readonly metrics: AppMetrics,
    private readonly imagePreprocessor: ImagePreprocessorService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {}

  async scan(user_id: string, scanOcrDto: ScanOcrDto) {
    this.metrics.ocrRequestsTotal.inc();
    const startTime = Date.now();

    const { imageUrl, sourceType } = scanOcrDto;

    const ocrRequest = await this.ocrRepository.createRequest(
      user_id,
      scanOcrDto,
    );

    try {
      // Wrap the async operation in `from` to convert the Promise to an Observable
      const ocrPromise = from(this.performOcrWithPreprocessing(imageUrl));

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

      const finalResult = await this.ocrRepository.createResult(
        ocrRequest.id,
        result,
      );

      this.metrics.ocrSuccessTotal.inc();
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.ocrProcessingDurationSeconds.observe(duration);

      return {
        ocrRequestId: finalResult.request_id,
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

      await this.ocrRepository.updateRequestStatus(
        ocrRequest.id,
        "failed",
        error.message,
      );

      this.metrics.ocrFailuresTotal.inc();
      const duration = (Date.now() - startTime) / 1000;
      this.metrics.ocrProcessingDurationSeconds.observe(duration);

      throw error;
    }
  }

  private async performOcrWithPreprocessing(imageUrl: string) {
    this.logger.log(`Starting OCR process for image: ${imageUrl}`);
    // FIX: Use the correct method 'downloadImage' instead of 'getImageBuffer'
    const imageBuffer = await this.storageReader.downloadImage(imageUrl);

    // Preprocess the image buffer using OpenCV
    const processedBuffer =
      await this.imagePreprocessor.preprocess(imageBuffer);

    // The ocrEngine.recognize method returns the raw text string.
    const rawText = await this.ocrEngine.recognize(processedBuffer);

    if (!rawText || rawText.trim().length < 5) {
      throw new AppError(
        "OCR_NO_TEXT_DETECTED",
        "Could not detect sufficient text in the image.",
      );
    }

    const parsedResult = this.ocrParser.parse(
      rawText,
      this.appConfig.ocr.engine,
      this.appConfig.ocr.lang,
    );

    return {
      ...parsedResult,
      imageUrl,
    };
  }

  async getResult(id: string, user_id: string) {
    const result = await this.ocrRepository.findResultById(id, user_id);
    if (!result) {
      throw new AppError("NOT_FOUND", `OCR result with ID ${id} not found.`);
    }
    return result;
  }

  async retry(id: string, user_id: string) {
    const originalRequest = await this.ocrRepository.findRequestById(
      id,
      user_id,
    );
    if (!originalRequest) {
      throw new AppError("NOT_FOUND", `OCR request with ID ${id} not found.`);
    }

    return this.scan(user_id, {
      imageUrl: originalRequest.image_url,
      sourceType: originalRequest.source_type,
    });
  }
}
