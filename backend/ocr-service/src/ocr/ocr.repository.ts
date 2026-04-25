import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_CONNECTION } from "../database/database.module";
import { ScanOcrDto } from "./dto/ocr.dto";
import { ParsedOcrResult } from "./ocr.parser";

@Injectable()
export class OcrRepository {
  constructor(@Inject(PG_CONNECTION) private readonly pool: Pool) { }

  async createRequest(userId: string, dto: ScanOcrDto) {
    const { imageUrl, sourceType } = dto;
    const result = await this.pool.query(
      `INSERT INTO "ocr".ocr_requests (user_id, image_url, source_type, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id, image_url, source_type, status, created_at`,
      [userId, imageUrl, sourceType],
    );
    return result.rows[0];
  }

  async findRequestById(id: string, userId: string) {
    const result = await this.pool.query(
      'SELECT * FROM "ocr".ocr_requests WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return result.rows[0];
  }

  async updateRequestStatus(
    id: string,
    status: "processed" | "failed",
    failureReason?: string,
  ) {
    await this.pool.query(
      'UPDATE "ocr".ocr_requests SET status = $1, failure_reason = $2, updated_at = NOW() WHERE id = $3',
      [status, failureReason, id],
    );
  }

  async createResult(requestId: string, parsedResult: ParsedOcrResult) {
    const {
      suggestedAmount,
      suggestedDate,
      merchantName,
      suggestedType,
      suggestedCategory,
      parsedFieldsJson,
    } = parsedResult;

    const result = await this.pool.query(
      `INSERT INTO "ocr".ocr_results 
        (request_id, suggested_amount, suggested_date, merchant_name, suggested_type, suggested_category, parsed_fields_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        requestId,
        suggestedAmount,
        suggestedDate,
        merchantName,
        suggestedType,
        suggestedCategory,
        JSON.stringify(parsedFieldsJson),
      ],
    );
    return result.rows[0];
  }

  async findResultById(id: string, userId: string) {
    const result = await this.pool.query(
      `SELECT r.* FROM "ocr".ocr_results r
           JOIN "ocr".ocr_requests req ON r.request_id = req.id
           WHERE r.id = $1 AND req.user_id = $2`,
      [id, userId],
    );
    return result.rows[0];
  }

  async findResultByRequestId(requestId: string) {
    const result = await this.pool.query(
      `SELECT * FROM "ocr".ocr_results WHERE request_id = $1`,
      [requestId],
    );
    return result.rows[0];
  }
}
