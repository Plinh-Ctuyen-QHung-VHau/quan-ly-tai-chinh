import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateAnomalyResultDto } from "./dto/anomaly.dto";

const FINANCE_SCHEMA = process.env.SUPABASE_DB_SCHEMA || "finance";

@Injectable()
export class AnomalyRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient().schema(FINANCE_SCHEMA);
  }

  async create(dto: CreateAnomalyResultDto) {
    const { data, error } = await this.supabase
      .from("anomaly_results")
      .insert({
        transaction_id: dto.transaction_id,
        user_id: dto.user_id,
        anomaly_type: dto.anomaly_type,
        anomaly_score: dto.anomaly_score,
        severity: dto.severity,
        reason: dto.reason,
        threshold_value: dto.threshold_value,
        actual_value: dto.actual_value,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findRecentByUser(user_id: string, limit: number = 5, fromDate?: string, toDate?: string) {
    let query = this.supabase
      .from("anomaly_results")
      .select("*")
      .eq("user_id", user_id);

    if (fromDate) query = query.gte("detected_at", fromDate);
    if (toDate) {
      const finalToDate = toDate.length === 10 ? `${toDate}T23:59:59.999Z` : toDate;
      query = query.lte("detected_at", finalToDate);
    }

    const { data, error } = await query
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  }

  async findByTransactionId(transaction_id: string) {
    const { data, error } = await this.supabase
      .from("anomaly_results")
      .select("*")
      .eq("transaction_id", transaction_id);

    if (error) throw new Error(error.message);
    return data || [];
  }

  async updateTransactionAnomalyFlag(transaction_id: string, anomaly_score: number) {
    const { error } = await this.supabaseService.getClient()
      .schema("transaction")
      .from("transactions")
      .update({
        is_anomaly: true,
        anomaly_score,
      })
      .eq("id", transaction_id);

    if (error) {
      console.error(`[AnomalyRepository] Failed to update transaction anomaly status:`, error.message);
    }
  }
}
