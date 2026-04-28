import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { ScanOcrDto } from "./dto/ocr.dto";
import { ParsedOcrResult } from "./ocr.parser";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "ocr";

@Injectable()
export class OcrRepository {
  constructor(private readonly supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async createRequest(user_id: string, dto: ScanOcrDto) {
    const { image_url, source_type } = dto;
    const { data, error } = await this.supabase
      .from("ocr_requests")
      .insert({
        user_id: user_id,
        image_url: image_url,
        source_type: source_type,
      })
      .select("id, image_url, source_type, status, created_at")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findRequestById(id: string, user_id: string) {
    const { data, error } = await this.supabase
      .from("ocr_requests")
      .select("*")
      .eq("id", id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateRequestStatus(
    id: string,
    status: "processed" | "failed",
    failureReason?: string,
  ) {
    const updatePayload: {
      status: "processed" | "failed";
      failure_reason?: string;
    } = {
      status,
    };

    if (failureReason) {
      // Assuming failure_reason is for logging or another purpose, not a DB column
      // If it were a column, it would be: updatePayload.failure_reason = failureReason;
    }

    const { error } = await this.supabase
      .from("ocr_requests")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async createResult(request_id: string, parsedResult: ParsedOcrResult) {
    const {
      extracted_text,
      suggested_amount,
      suggested_date,
      suggested_type,
      suggested_category_id,
      merchant_name,
      confidence_score,
      parsed_fields_json,
    } = parsedResult;

    const { data, error } = await this.supabase
      .from("ocr_results")
      .insert({
        request_id: request_id,
        extracted_text: extracted_text,
        suggested_amount: suggested_amount,
        suggested_date: suggested_date,
        suggested_type: suggested_type,
        suggested_category_id: suggested_category_id,
        merchant_name: merchant_name,
        confidence_score: confidence_score,
        parsed_fields_json: parsed_fields_json,
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
  async findResultById(id: string, user_id: string) {
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
      .eq("user_id", user_id)
      .maybeSingle();

    if (requestError) throw new Error(requestError.message);
    if (!request) return null;

    return result;
  }

  async findResultByrequest_id(request_id: string) {
    const { data, error } = await this.supabase
      .from("ocr_results")
      .select("*")
      .eq("request_id", request_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
}
