import { Inject, Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "budget";

// This is a simplified entity representation
export interface Budget {
  id: string;
  user_id: string;
  budget_amount: number;
  budget_period: "weekly" | "monthly";
  start_date: Date;
  end_date: Date;
  status: "active" | "completed" | "exceeded" | "deleted";
  alert_80_sent: boolean;
  alert_100_sent: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class BudgetsRepository {
  constructor(private readonly supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async create(
    user_id: string,
    createBudgetDto: CreateBudgetDto,
  ): Promise<Budget> {
    const budget_amount = Number(
      (createBudgetDto as any).budget_amount ??
      (createBudgetDto as any).budgetAmount,
    );
    const budget_period =
      (createBudgetDto as any).budget_period ??
      (createBudgetDto as any).budgetPeriod;
    const start_date =
      (createBudgetDto as any).start_date ?? (createBudgetDto as any).startDate;
    const end_date =
      (createBudgetDto as any).end_date ?? (createBudgetDto as any).endDate;

    const { data, error } = await this.supabase
      .from("budgets")
      .insert({
        user_id: user_id,
        budget_amount: budget_amount,
        budget_period: budget_period,
        start_date: start_date,
        end_date: end_date,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToBudget(data);
  }

  async findById(id: string, user_id: string): Promise<Budget | null> {
    const { data, error } = await this.supabase
      .from("budgets")
      .select("*")
      .eq("id", id)
      .eq("user_id", user_id)
      .neq("status", "deleted")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  async findCurrentActive(user_id: string): Promise<Budget | null> {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" for date comparison
    const { data, error } = await this.supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user_id)
      .eq("status", "active")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  async update(
    id: string,
    user_id: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<Budget | null> {
    const budget_amount = Number(
      (updateBudgetDto as any).budget_amount ??
      (updateBudgetDto as any).budgetAmount,
    );
    const budget_period =
      (updateBudgetDto as any).budget_period ??
      (updateBudgetDto as any).budgetPeriod;
    const start_date =
      (updateBudgetDto as any).start_date ?? (updateBudgetDto as any).startDate;
    const end_date =
      (updateBudgetDto as any).end_date ?? (updateBudgetDto as any).endDate;

    const { data, error } = await this.supabase
      .from("budgets")
      .update({
        budget_amount: updateBudgetDto.budget_amount,
        budget_period: updateBudgetDto.budget_period,
        start_date: updateBudgetDto.start_date,
        end_date: updateBudgetDto.end_date,
      })
      .eq("id", id)
      .eq("user_id", user_id)
      .neq("status", "deleted")
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  async softDelete(id: string, user_id: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from("budgets")
      .update({ status: "deleted" }, { count: "exact" })
      .eq("id", id)
      .eq("user_id", user_id);

    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  async updateAlertSent(
    id: string,
    alertType: "80" | "100",
  ): Promise<Budget | null> {
    const updatePayload: Record<string, any> =
      alertType === "80" ? { alert_80_sent: true } : { alert_100_sent: true };

    const { data, error } = await this.supabase
      .from("budgets")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  async updateStatus(
    id: string,
    status: "active" | "completed" | "exceeded",
  ): Promise<Budget | null> {
    const { data, error } = await this.supabase
      .from("budgets")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  private toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
  }

  private mapToBudget(row: any): Budget {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      budget_amount: parseFloat(row.budget_amount),
      budget_period: row.budget_period,
      start_date: this.toDate(row.start_date),
      end_date: this.toDate(row.end_date),
      status: row.status,
      alert_80_sent: row.alert_80_sent,
      alert_100_sent: row.alert_100_sent,
      created_at: this.toDate(row.created_at),
      updated_at: this.toDate(row.updated_at),
    };
  }
}
