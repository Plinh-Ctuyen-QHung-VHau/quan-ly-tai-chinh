import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { AppError } from "@shared/errors/AppError";
import { StorageReader } from "../storage/storage.reader";
import {
  OCR_ENGINE_ADAPTER,
  OcrEngineAdapter,
} from "./adapters/ocr-engine.adapter";
import { OcrEngineSelector } from "./adapters/ocr-engine-selector";
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
  private readonly compareEngines: boolean;
  private readonly allEngines: OcrEngineAdapter[];

  constructor(
    private readonly ocrRepository: OcrRepository,
    private readonly storageReader: StorageReader,
    @Inject(OCR_ENGINE_ADAPTER)
    private readonly primaryEngine: OcrEngineAdapter,
    @Inject("OCR_ENGINES_ALL")
    allEngines: OcrEngineAdapter[],
    private readonly engineSelector: OcrEngineSelector,
    private readonly ocrParser: OcrParser,
    private readonly metrics: AppMetrics,
    private readonly imagePreprocessor: ImagePreprocessorService,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {
    this.compareEngines = process.env.OCR_COMPARE_ENGINES === "true";
    this.allEngines = allEngines;
    this.logger.log(
      `OCR engines: primary=${primaryEngine.name}, compare=${this.compareEngines}, available=[${allEngines.map(e => e.name).join(",")}]`,
    );
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

    // 3. Preprocess (OpenCV) — only for Tesseract path
    const tPre = Date.now();
    const processedBuffer = await this.imagePreprocessor.preprocess(imageBuffer, "standard");
    this.logger.log(`[perf] Preprocess: ${Date.now() - tPre}ms`);

    // 4. Choose engine strategy
    if (this.compareEngines && this.allEngines.length > 1) {
      return this.runCompareMode(processedBuffer, image_url, t0);
    } else {
      return this.runSingleEngine(processedBuffer, image_url, t0);
    }
  }

  /**
   * Single engine mode: run primary engine with variant fallback.
   */
  private async runSingleEngine(imageBuffer: Buffer, image_url: string, t0: number) {
    const variants = ["standard", "upscale_gray"];
    let bestResult = null;
    let highestScore = -1;

    for (const variant of variants) {
      try {
        const tVar = Date.now();
        const buffer = variant === "standard"
          ? imageBuffer
          : await this.imagePreprocessor.preprocess(imageBuffer, variant);
        this.logger.log(`[perf] Preprocess(${variant}): ${Date.now() - tVar}ms`);

        const ocrResult = await this.primaryEngine.recognize(buffer);
        this.logger.log(`[perf] ${this.primaryEngine.name}(${variant}): ${ocrResult.durationMs}ms`);

        if (!ocrResult.rawText || ocrResult.rawText.trim().length < 5) {
          this.logger.warn(`Variant ${variant}: text too short, skipping`);
          continue;
        }

        const parsedResult = this.ocrParser.parse(
          ocrResult.rawText,
          ocrResult,
          this.primaryEngine.name,
          this.appConfig.ocr.lang,
        );

        parsedResult.parsed_fields_json.preprocessing_variant = variant;
        parsedResult.parsed_fields_json.selected_ocr_engine = this.primaryEngine.name;

        if (parsedResult.confidence_score > highestScore) {
          highestScore = parsedResult.confidence_score;
          bestResult = parsedResult;
        }

        if (highestScore > 55) {
          this.logger.log(`[perf] Short-circuit at '${variant}' score=${highestScore}`);
          break;
        }
      } catch (err) {
        this.logger.warn(`Variant ${variant} failed: ${err.message}`);
      }
    }

    this.logger.log(`[perf] Total OCR pipeline: ${Date.now() - t0}ms`);

    if (!bestResult) {
      throw new AppError(
        "OCR_NO_TEXT_DETECTED",
        "Could not detect sufficient text in the image.",
      );
    }

    return { ...bestResult, image_url };
  }

  /**
   * Compare mode: run all engines, parse each, pick the best by parse quality.
   */
  private async runCompareMode(imageBuffer: Buffer, image_url: string, t0: number) {
    const selectorResult = await this.engineSelector.selectBest(
      this.allEngines,
      imageBuffer,
      this.appConfig.ocr.lang,
    );

    this.logger.log(`[perf] Total compare pipeline: ${Date.now() - t0}ms`);

    if (!selectorResult) {
      throw new AppError(
        "OCR_NO_TEXT_DETECTED",
        "No engine could detect sufficient text.",
      );
    }

    const { best, all } = selectorResult;
    const parsedResult = best.parsedResult;

    // Enrich parsed_fields_json with comparison data
    parsedResult.parsed_fields_json.selected_ocr_engine = best.engineResult.engine;
    parsedResult.parsed_fields_json.ocr_engine_results = all.map(r => ({
      engine: r.engineResult.engine,
      confidence: r.engineResult.confidence,
      parse_score: r.parseScore,
      raw_text_preview: r.engineResult.rawText.slice(0, 200),
      duration_ms: r.engineResult.durationMs,
      warnings: r.engineResult.warnings,
    }));

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
