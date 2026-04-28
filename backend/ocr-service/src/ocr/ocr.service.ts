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
  ) { }

  async scan(user_id: string, scanOcrDto: ScanOcrDto) {
    this.metrics.ocrRequestsTotal.inc();
    const startTime = Date.now();

    const { image_url, source_type } = scanOcrDto;

    const ocrRequest = await this.ocrRepository.createRequest(
      user_id,
      scanOcrDto,
    );

    try {
      // Wrap the async operation in `from` to convert the Promise to an Observable
      const ocrPromise = from(this.performOcrWithPreprocessing(image_url));

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
        ocrrequest_id: finalResult.request_id,
        ocr_result_id: finalResult.id,
        image_url,
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

  private async performOcrWithPreprocessing(image_url: string) {
    this.logger.log(`Starting OCR process for image: ${image_url}`);
    const imageBuffer = await this.storageReader.downloadImage(image_url);

    const variants = ["standard", "upscale_gray", "adaptive"];
    let bestResult = null;
    let highestScore = -1;

    for (const variant of variants) {
      try {
        const processedBuffer = await this.imagePreprocessor.preprocess(imageBuffer, variant);
        const ocrResult = await this.ocrEngine.recognize(processedBuffer);
        const rawText = ocrResult.text;

        if (!rawText || rawText.trim().length < 5) {
          continue;
        }

        const parsedResult = this.ocrParser.parse(
          rawText,
          ocrResult,
          this.appConfig.ocr.engine,
          this.appConfig.ocr.lang,
        );

        parsedResult.parsed_fields_json.preprocessing_variant = variant;

        if (parsedResult.confidence_score > highestScore) {
          highestScore = parsedResult.confidence_score;
          bestResult = parsedResult;
        }

        // If we found a very good score, we can short-circuit
        if (highestScore > 85) {
          break;
        }
      } catch (err) {
        this.logger.warn(`OCR Variant ${variant} failed: ${err.message}`);
      }
    }

    if (!bestResult) {
      throw new AppError(
        "OCR_NO_TEXT_DETECTED",
        "Could not detect sufficient text in the image across all variants.",
      );
    }

    return {
      ...bestResult,
      image_url,
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
      image_url: originalRequest.image_url,
      source_type: originalRequest.source_type,
    });
  }
}
