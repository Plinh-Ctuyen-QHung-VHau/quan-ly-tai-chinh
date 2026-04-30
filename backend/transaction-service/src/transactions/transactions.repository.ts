import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";
import {
  GetTransactionsQueryDto,
  GetTransactionSummaryQueryDto,
} from "./dto/get-transactions-query.dto";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "transaction";

@Injectable()
export class TransactionsRepository {
  constructor(private readonly supabaseService: SupabaseService) { }

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async create(user_id: string, dto: CreateTransactionDto) {
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        user_id,
        type: dto.type,
        amount: dto.amount,
        category_id: dto.category_id,
        note: dto.note,
        transaction_date: dto.transaction_date,
        source: dto.source,
        image_url: dto.image_url,
        merchant_name: dto.merchant_name,
        ocr_result_id: dto.ocr_result_id,
        isAnomaly: dto.isAnomaly,
        anomaly_score: dto.anomaly_score,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (data) data.amount = Number(data.amount);
    return data;
  }

  async findById(id: string, user_id: string) {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) data.amount = Number(data.amount);
    return data;
  }

  async findAll(user_id: string, queryDto: GetTransactionsQueryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = "transaction_date",
      sortOrder = "DESC",
      type,
      category_id,
      fromDate,
      toDate,
      keyword,
    } = queryDto;

    // --- Count query ---
    let countQuery = this.supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id);

    if (type) countQuery = countQuery.eq("type", type);
    if (category_id) countQuery = countQuery.eq("category_id", category_id);
    if (fromDate) {
      countQuery = countQuery.gte("transaction_date", fromDate);
    }
    if (toDate) {
      const finalToDate = toDate.length === 10 ? `${toDate}T23:59:59.999Z` : toDate;
      countQuery = countQuery.lte("transaction_date", finalToDate);
    }
    if (keyword) {
      countQuery = countQuery.or(
        `note.ilike.%${keyword}%,merchant_name.ilike.%${keyword}%`,
      );
    }

    const { count: totalItems, error: countError } = await countQuery;
    if (countError) throw new Error(countError.message);

    // --- Data query with category join ---
    const validSortBy = ["transaction_date", "amount", "created_at"];
    const safeSortBy = validSortBy.includes(sortBy)
      ? sortBy
      : "transaction_date";
    const ascending = sortOrder === "ASC";

    const offset = (page - 1) * limit;

    let dataQuery = this.supabase
      .from("transactions")
      .select("*, categories!category_id(name, icon)")
      .eq("user_id", user_id)
      .order(safeSortBy, { ascending })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) dataQuery = dataQuery.eq("type", type);
    if (category_id) dataQuery = dataQuery.eq("category_id", category_id);
    if (fromDate) dataQuery = dataQuery.gte("transaction_date", fromDate);
    if (toDate) dataQuery = dataQuery.lte("transaction_date", toDate);
    if (keyword) {
      dataQuery = dataQuery.or(
        `note.ilike.%${keyword}%,merchant_name.ilike.%${keyword}%`,
      );
    }

    const { data, error: dataError } = await dataQuery;
    if (dataError) throw new Error(dataError.message);

    // Flatten the nested categories join
    const rows = (data || []).map((row: any) => {
      const { categories, ...rest } = row;
      return {
        ...rest,
        amount: Number(rest.amount),
        category_name: categories?.name || null,
        category_icon: categories?.icon || null,
      };
    });

    return {
      data: rows,
      meta: {
        totalItems: totalItems || 0,
        itemCount: rows.length,
        itemsPerPage: limit,
        totalPages: Math.ceil((totalItems || 0) / limit),
        currentPage: page,
      },
    };
  }

  async update(id: string, user_id: string, dto: UpdateTransactionDto) {
    const { data, error } = await this.supabase
      .from("transactions")
      .update({
        type: dto.type,
        amount: dto.amount,
        category_id: dto.category_id,
        note: dto.note,
        transaction_date: dto.transaction_date,
        merchant_name: dto.merchant_name,
        isAnomaly: dto.isAnomaly,
        anomaly_score: dto.anomaly_score,
      })
      .eq("id", id)
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    if (data) data.amount = Number(data.amount);
    return data;
  }

  async delete(id: string, user_id: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from("transactions")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user_id);

    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  /**
   * Returns transactions grouped by date for the last 30 days.
   * NOTE: GROUP BY + json_agg not supported in Supabase JS client.
   * Grouping is done in TypeScript.
   * TODO: Consider a DB RPC/view for better performance on large datasets.
   */
  async getHistory(user_id: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .from("transactions")
      .select(
        "id, type, amount, note, merchant_name, transaction_date, categories!category_id(name, icon)",
      )
      .eq("user_id", user_id)
      .gte("transaction_date", thirtyDaysAgo.toISOString())
      .order("transaction_date", { ascending: false });

    if (error) throw new Error(error.message);

    // Group by date in JS
    const grouped: Record<string, any[]> = {};
    for (const row of data || []) {
      const date = (row.transaction_date as string).slice(0, 10); // YYYY-MM-DD
      if (!grouped[date]) grouped[date] = [];
      const { categories, ...rest } = row as any;
      grouped[date].push({
        id: rest.id,
        type: rest.type,
        amount: Number(rest.amount),
        note: rest.note,
        merchant_name: rest.merchant_name,
        category_name: categories?.name || null,
        category_icon: categories?.icon || null,
      });
    }

    return Object.entries(grouped).map(([date, transactions]) => ({
      date,
      transactions,
    }));
  }

  async getSummary(user_id: string, queryDto: GetTransactionSummaryQueryDto) {
    const { fromDate, toDate } = queryDto;

    let query = this.supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", user_id);

    if (fromDate) query = query.gte("transaction_date", fromDate);
    if (toDate) {
      // Nếu toDate chỉ có ngày (YYYY-MM-DD), thêm giờ để bao phủ hết ngày đó
      const finalToDate = toDate.length === 10 ? `${toDate}T23:59:59.999Z` : toDate;
      query = query.lte("transaction_date", finalToDate);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let total_income = 0;
    let total_expense = 0;

    for (const row of data || []) {
      const amount = parseFloat(row.amount);
      if (row.type === "income") total_income += amount;
      else if (row.type === "expense") total_expense += amount;
    }

    return {
      total_income,
      total_expense,
      balance: total_income - total_expense,
    };
  }
}
