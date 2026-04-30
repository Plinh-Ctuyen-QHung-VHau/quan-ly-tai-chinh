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
    private readonly primaryEngine: OcrEngineAdapter,
    private readonly ocrParser: OcrParser,
    private readonly metrics: AppMetrics,
    private readonly imagePreprocessor: ImagePreprocessorService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {
    this.logger.log(`OCR engine: ${primaryEngine.name} (Tesseract + Gemini 3 Flash Preview)`);
  }

  async scan(user_id: string, scanOcrDto: ScanOcrDto) {
    this.metrics.ocrRequestsTotal.inc();
    const startTime = Date.now();

    const { image_url, source_type } = scanOcrDto;

    const ocrRequest = await this.ocrRepository.createRequest(
      user_id,
      scanOcrDto,
    );

    try {
      const ocrPromise = from(this.performOcr(image_url));

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

  private async performOcr(image_url: string) {
    this.logger.log(`Starting OCR pipeline for: ${image_url}`);
    const t0 = Date.now();

    // 1. Download image
    const rawBuffer = await this.storageReader.downloadImage(image_url);
    this.logger.log(`[perf] Download: ${Date.now() - t0}ms (${(rawBuffer.length / 1024).toFixed(0)} KB)`);

    // 2. Resize if needed
    const imageBuffer = await this.resizeIfNeeded(rawBuffer, 1600);
    this.logger.log(`[perf] After resize: ${(imageBuffer.length / 1024).toFixed(0)} KB`);

    // 3. Preprocess (OpenCV) for Tesseract
    const tPre = Date.now();
    const processedBuffer = await this.imagePreprocessor.preprocess(imageBuffer, "standard");
    this.logger.log(`[perf] Preprocess: ${Date.now() - tPre}ms`);

    // 4. Run Tesseract OCR
    const ocrResult = await this.primaryEngine.recognize(processedBuffer);
    this.logger.log(`[perf] ${this.primaryEngine.name}: ${ocrResult.durationMs}ms`);

    if (!ocrResult.rawText || ocrResult.rawText.trim().length < 5) {
      throw new AppError(
        "OCR_NO_TEXT_DETECTED",
        "Could not detect sufficient text in the image.",
      );
    }

    // 5. Parse with Gemini 3 Flash Preview
    const parsedResult = await this.ocrParser.parse(
      ocrResult.rawText,
      ocrResult,
      this.primaryEngine.name,
      this.appConfig.ocr.lang,
    );

    parsedResult.parsed_fields_json.selected_ocr_engine = this.primaryEngine.name;

    this.logger.log(`[perf] Total OCR pipeline: ${Date.now() - t0}ms`);

    return { ...parsedResult, image_url };
  }

  /**
   * Resize image to maxWidth if larger, using sharp.
   */
  private async resizeIfNeeded(buffer: Buffer, maxWidth: number): Promise<Buffer> {
    try {
      const sharp = require("sharp");
      const meta = await sharp(buffer).metadata();
      if (meta.width && meta.width > maxWidth) {
        this.logger.log(`Resizing from ${meta.width}x${meta.height} → maxWidth=${maxWidth}`);
        return await sharp(buffer)
          .resize({ width: maxWidth, withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
      }
      return buffer;
    } catch (err) {
      this.logger.warn(`Resize skipped: ${err.message}`);
      return buffer;
    }
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
