import { Inject, Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "budget";

// This is a simplified entity representation
export interface Budget {
  id: string;
  userId: string;
  budgetAmount: number;
  budgetPeriod: "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  status: "active" | "inactive" | "exceeded" | "deleted";
  alert80Sent: boolean;
  alert100Sent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BudgetsRepository {
  constructor(private readonly supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async create(
    userId: string,
    createBudgetDto: CreateBudgetDto,
  ): Promise<Budget> {
    const { budgetAmount, budgetPeriod, startDate, endDate } = createBudgetDto;
    const { data, error } = await this.supabase
      .from("budgets")
      .insert({
        user_id: userId,
        budget_amount: budgetAmount,
        budget_period: budgetPeriod,
        start_date: startDate,
        end_date: endDate,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToBudget(data);
  }

  async findById(id: string, userId: string): Promise<Budget | null> {
    const { data, error } = await this.supabase
      .from("budgets")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .neq("status", "deleted")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  async findCurrentActive(userId: string): Promise<Budget | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .lte("start_date", now)
      .gte("end_date", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  async update(
    id: string,
    userId: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<Budget | null> {
    const updatePayload: Record<string, any> = {};
    if (updateBudgetDto.budgetAmount !== undefined)
      updatePayload.budget_amount = updateBudgetDto.budgetAmount;
    if (updateBudgetDto.budgetPeriod !== undefined)
      updatePayload.budget_period = updateBudgetDto.budgetPeriod;
    if (updateBudgetDto.startDate !== undefined)
      updatePayload.start_date = updateBudgetDto.startDate;
    if (updateBudgetDto.endDate !== undefined)
      updatePayload.end_date = updateBudgetDto.endDate;

    const { data, error } = await this.supabase
      .from("budgets")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
      .neq("status", "deleted")
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data ? this.mapToBudget(data) : null;
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from("budgets")
      .update({ status: "deleted" })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  async updateAlertSent(
    id: string,
    alertType: "80" | "100",
  ): Promise<Budget | null> {
    const updatePayload: Record<string, any> =
      alertType === "80"
        ? { alert_80_sent: true }
        : { alert_100_sent: true };

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
    status: "active" | "inactive" | "exceeded",
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

  private mapToBudget(row: any): Budget {
    return {
      id: row.id,
      userId: row.user_id,
      budgetAmount: parseFloat(row.budget_amount),
      budgetPeriod: row.budget_period,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      alert80Sent: row.alert_80_sent,
      alert100Sent: row.alert_100_sent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
