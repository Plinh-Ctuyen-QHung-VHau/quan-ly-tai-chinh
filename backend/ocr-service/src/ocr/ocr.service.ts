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
import { EventPublisher } from "@shared/events/event.publisher";

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
    private readonly eventPublisher: EventPublisher,
    @Inject(configuration.KEY)
    private readonly appConfig: ConfigType<typeof configuration>,
  ) {
    this.logger.log(`[Khởi tạo] Sử dụng OCR engine: ${primaryEngine.name} kết hợp model Gemini`);
  }

  async scan(user_id: string, scanOcrDto: ScanOcrDto) {
    this.metrics.ocrRequestsTotal.inc();
    const startTime = Date.now();

    const { image_url, source_type } = scanOcrDto;

    const ocrRequest = await this.ocrRepository.createRequest(
      user_id,
      scanOcrDto,
    );

    this.eventPublisher.publish("ocr.started", {
      request_id: ocrRequest.id,
      user_id,
      image_url,
      source_type,
    }, "ocr-service").catch(err => console.error(err));

    try {
      const ocrPromise = from(this.performOcr(image_url));

      const timeout$ = timer(this.appConfig.ocr.timeoutMs).pipe(
        map(() => {
          throw new AppError(
            "OCR_PROCESSING_FAILED",
            "Hệ thống phản hồi quá lâu, vui lòng chụp lại ảnh nhé.",
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

      await this.eventPublisher.publish("ocr.processed", {
        request_id: ocrRequest.id,
        user_id,
        image_url,
        duration_seconds: duration,
      }, "ocr-service");

      return {
        ocrrequest_id: finalResult.request_id,
        ocr_result_id: finalResult.id,
        image_url,
        ...finalResult,
      };
    } catch (error) {
      this.logger.error(
        `Tiến trình OCR thất bại đối với request: ${ocrRequest.id}`,
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

      await this.eventPublisher.publish("ocr.failed", {
        request_id: ocrRequest.id,
        user_id,
        image_url,
        reason: error.message,
        duration_seconds: duration,
      }, "ocr-service");

      throw error;
    }
  }

  private async performOcr(image_url: string) {
    this.logger.log(`Bắt đầu chạy luồng OCR cho ảnh: ${image_url}`);
    const t0 = Date.now();


    const rawBuffer = await this.storageReader.downloadImage(image_url);
    this.logger.log(`[Thời gian] Tải ảnh: ${Date.now() - t0}ms (${(rawBuffer.length / 1024).toFixed(0)} KB)`);


    const imageBuffer = await this.resizeIfNeeded(rawBuffer, 1600);
    this.logger.log(`[Thời gian] Sau khi nén: ${(imageBuffer.length / 1024).toFixed(0)} KB`);


    const tPre = Date.now();
    const processedBuffer = await this.imagePreprocessor.preprocess(imageBuffer, "standard");
    this.logger.log(`[Thời gian] Xử lý OpenCV: ${Date.now() - tPre}ms`);


    const ocrResult = await this.primaryEngine.recognize(processedBuffer);
    this.logger.log(`[Thời gian] Nhận diện chữ bằng ${this.primaryEngine.name}: ${ocrResult.durationMs}ms`);

    if (!ocrResult.rawText || ocrResult.rawText.trim().length < 5) {
      throw new AppError(
        "OCR_NO_TEXT_DETECTED",
        "Ảnh mờ quá hoặc không có chữ, vui lòng chụp lại hóa đơn rõ hơn nha.",
      );
    }


    const parsedResult = await this.ocrParser.parse(
      ocrResult.rawText,
      ocrResult,
      this.primaryEngine.name,
      this.appConfig.ocr.lang,
    );

    parsedResult.parsed_fields_json.selected_ocr_engine = this.primaryEngine.name;

    this.logger.log(`[Thời gian] Tổng cộng luồng OCR tốn: ${Date.now() - t0}ms`);

    return { ...parsedResult, image_url };
  }

  /**
   * Nén ảnh về kích thước an toàn (maxWidth) bằng sharp để tiết kiệm RAM.
   */
  private async resizeIfNeeded(buffer: Buffer, maxWidth: number): Promise<Buffer> {
    try {
      const sharp = require("sharp");
      const meta = await sharp(buffer).metadata();
      if (meta.width && meta.width > maxWidth) {
        this.logger.log(`Đang resize ảnh từ ${meta.width}x${meta.height} về giới hạn maxWidth=${maxWidth}`);
        return await sharp(buffer)
          .resize({ width: maxWidth, withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();
      }
      return buffer;
    } catch (err) {
      this.logger.warn(`Bỏ qua bước nén ảnh vì lỗi: ${err.message}`);
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
