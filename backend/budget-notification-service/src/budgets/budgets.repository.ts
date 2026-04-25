import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_CONNECTION } from "../database/database.module";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";

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
  constructor(@Inject(PG_CONNECTION) private readonly pool: Pool) {}

  async create(
    userId: string,
    createBudgetDto: CreateBudgetDto,
  ): Promise<Budget> {
    const { budgetAmount, budgetPeriod, startDate, endDate } = createBudgetDto;
    const query = `
      INSERT INTO budget.budgets (user_id, budget_amount, budget_period, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await this.pool.query(query, [
      userId,
      budgetAmount,
      budgetPeriod,
      startDate,
      endDate,
    ]);
    return this.mapToBudget(res.rows[0]);
  }

  async findById(id: string, userId: string): Promise<Budget | null> {
    const query = `SELECT * FROM budget.budgets WHERE id = $1 AND user_id = $2 AND status != 'deleted'`;
    const res = await this.pool.query(query, [id, userId]);
    if (res.rowCount === 0) {
      return null;
    }
    return this.mapToBudget(res.rows[0]);
  }

  async findCurrentActive(userId: string): Promise<Budget | null> {
    const now = new Date();
    const query = `
        SELECT * FROM budget.budgets 
        WHERE user_id = $1 
        AND status = 'active' 
        AND start_date <= $2 
        AND end_date >= $2
        ORDER BY created_at DESC
        LIMIT 1;
    `;
    const res = await this.pool.query(query, [userId, now]);
    if (res.rowCount === 0) {
      return null;
    }
    return this.mapToBudget(res.rows[0]);
  }

  async update(
    id: string,
    userId: string,
    updateBudgetDto: UpdateBudgetDto,
  ): Promise<Budget | null> {
    const { budgetAmount, budgetPeriod, startDate, endDate } = updateBudgetDto;
    const query = `
      UPDATE budget.budgets
      SET 
        budget_amount = COALESCE($1, budget_amount),
        budget_period = COALESCE($2, budget_period),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6 AND status != 'deleted'
      RETURNING *;
    `;
    const res = await this.pool.query(query, [
      budgetAmount,
      budgetPeriod,
      startDate,
      endDate,
      id,
      userId,
    ]);
    if (res.rowCount === 0) {
      return null;
    }
    return this.mapToBudget(res.rows[0]);
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const query = `UPDATE budget.budgets SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND user_id = $2`;
    const res = await this.pool.query(query, [id, userId]);
    return res.rowCount > 0;
  }

  async updateAlertSent(
    id: string,
    alertType: "80" | "100",
  ): Promise<Budget | null> {
    const field = alertType === "80" ? "alert_80_sent" : "alert_100_sent";
    const query = `
        UPDATE budget.budgets 
        SET ${field} = true, updated_at = NOW() 
        WHERE id = $1
        RETURNING *;
    `;
    const res = await this.pool.query(query, [id]);
    return res.rowCount > 0 ? this.mapToBudget(res.rows[0]) : null;
  }

  async updateStatus(
    id: string,
    status: "active" | "inactive" | "exceeded",
  ): Promise<Budget | null> {
    const query = `
        UPDATE budget.budgets 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2
        RETURNING *;
    `;
    const res = await this.pool.query(query, [status, id]);
    return res.rowCount > 0 ? this.mapToBudget(res.rows[0]) : null;
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
