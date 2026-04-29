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

  async findRecentByUser(user_id: string, limit: number = 5) {
    const { data, error } = await this.supabase
      .from("anomaly_results")
      .select("*")
      .eq("user_id", user_id)
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
}
