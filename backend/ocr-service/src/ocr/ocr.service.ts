import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { Counter, Histogram } from "prom-client";
import { OcrRepository } from "./ocr.repository";
import { ScanOcrDto } from "./dto/ocr.dto";
import { StorageReader } from "../storage/storage.reader";
import {
  OcrEngineAdapter,
  OCR_ENGINE_ADAPTER,
} from "./adapters/ocr-engine.adapter";
import { OcrParser } from "./ocr.parser";
import { AppError } from "../../shared/errors/AppError";
import { ERROR_CODES } from "../../shared/errors/errorCodes";
import { OCR_METRICS } from "../metrics/ocr-metrics";

@Injectable()
export class OcrService {
  private readonly ocrRequests: Counter<string>;
  private readonly ocrSuccess: Counter<string>;
  private readonly ocrFailures: Counter<string>;
  private readonly ocrDuration: Histogram<string>;

  constructor(
    private readonly ocrRepository: OcrRepository,
    private readonly storageReader: StorageReader,
    @Inject(OCR_ENGINE_ADAPTER) private readonly ocrEngine: OcrEngineAdapter,
    private readonly ocrParser: OcrParser,
  ) {
    this.ocrRequests = OCR_METRICS.ocrRequests;
    this.ocrSuccess = OCR_METRICS.ocrSuccess;
    this.ocrFailures = OCR_METRICS.ocrFailures;
    this.ocrDuration = OCR_METRICS.ocrDuration;
  }

  async scan(userId: string, dto: ScanOcrDto) {
    this.ocrRequests.inc({ source: dto.sourceType });
    const endTimer = this.ocrDuration.startTimer();

    const { id: requestId } = await this.ocrRepository.createRequest(
      userId,
      dto,
    );

    try {
      // The imageUrl from the client is the full public URL. We need the path part.
      const url = new URL(dto.imageUrl);
      const path = url.pathname.split(
        `/${this.storageReader["bucketName"]}/`,
      )[1];

      const imageBuffer = await this.storageReader.downloadImage(path);
      const rawText = await this.ocrEngine.extractText(imageBuffer);
      const parsedResult = this.ocrParser.parse(rawText);

      const ocrResult = await this.ocrRepository.createResult(
        requestId,
        parsedResult,
      );
      await this.ocrRepository.updateRequestStatus(requestId, "processed");

      this.ocrSuccess.inc({ source: dto.sourceType });
      endTimer({ status: "success" });

      return ocrResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown OCR processing error";
      await this.ocrRepository.updateRequestStatus(
        requestId,
        "failed",
        errorMessage,
      );

      this.ocrFailures.inc({ source: dto.sourceType });
      endTimer({ status: "failure" });

      throw new AppError(errorMessage, ERROR_CODES.OCR_PROCESSING_FAILED, {
        originalError: error,
      });
    }
  }

  async getResult(id: string, userId: string) {
    const result = await this.ocrRepository.findResultById(id, userId);
    if (!result) {
      throw new AppError("OCR result not found", ERROR_CODES.NOT_FOUND);
    }
    return result;
  }

  async retry(id: string, userId: string) {
    const request = await this.ocrRepository.findRequestById(id, userId);
    if (!request) {
      throw new AppError("OCR request not found", ERROR_CODES.NOT_FOUND);
    }

    // Check if there's already a successful result
    const existingResult = await this.ocrRepository.findResultByRequestId(id);
    if (existingResult && request.status === "processed") {
      return existingResult; // Don't re-process successful requests, just return the result
    }

    return this.scan(userId, {
      imageUrl: request.image_url,
      sourceType: request.source_type,
    });
  }
}
