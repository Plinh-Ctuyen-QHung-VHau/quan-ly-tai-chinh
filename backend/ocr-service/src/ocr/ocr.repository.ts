import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { ScanOcrDto } from "./dto/ocr.dto";
import { ParsedOcrResult } from "./ocr.parser";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "ocr";

@Injectable()
export class OcrRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async createRequest(userId: string, dto: ScanOcrDto) {
    const { imageUrl, sourceType } = dto;
    const { data, error } = await this.supabase
      .from("ocr_requests")
      .insert({
        user_id: userId,
        image_url: imageUrl,
        source_type: sourceType,
        status: "pending",
      })
      .select("id, image_url, source_type, status, created_at")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findRequestById(id: string, userId: string) {
    const { data, error } = await this.supabase
      .from("ocr_requests")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateRequestStatus(
    id: string,
    status: "processed" | "failed",
    failureReason?: string,
  ) {
    const { error } = await this.supabase
      .from("ocr_requests")
      .update({
        status,
        failure_reason: failureReason || null,
      })
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async createResult(requestId: string, parsedResult: ParsedOcrResult) {
    const {
      suggestedAmount,
      suggestedDate,
      suggestedType,
      suggestedCategory,
      parsedFieldsJson,
    } = parsedResult;

    const parsedFields =
      parsedFieldsJson && typeof parsedFieldsJson === "object"
        ? {
            ...parsedFieldsJson,
            suggestedCategory: suggestedCategory ?? null,
          }
        : {
            suggestedCategory: suggestedCategory ?? null,
          };

    const { data, error } = await this.supabase
      .from("ocr_results")
      .insert({
        request_id: requestId,
        extracted_text: null,
        suggested_amount: suggestedAmount ?? null,
        suggested_date: suggestedDate ?? null,
        suggested_type: suggestedType ?? null,
        suggested_category_id: null,
        confidence_score: null,
        parsed_fields_json: parsedFields,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  /**
   * Find result by ID, ensuring it belongs to the given user via ocr_requests join.
   * Uses 2-query approach since Supabase nested selects may not work for reverse joins.
   */
  async findResultById(id: string, userId: string) {
    // First verify the result exists
    const { data: result, error: resultError } = await this.supabase
      .from("ocr_results")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (resultError) throw new Error(resultError.message);
    if (!result) return null;

    // Verify the request belongs to the user
    const { data: request, error: requestError } = await this.supabase
      .from("ocr_requests")
      .select("id")
      .eq("id", result.request_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (requestError) throw new Error(requestError.message);
    if (!request) return null;

    return result;
  }

  async findResultByRequestId(requestId: string) {
    const { data, error } = await this.supabase
      .from("ocr_results")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
}
