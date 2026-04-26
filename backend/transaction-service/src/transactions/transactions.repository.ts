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
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async create(userId: string, dto: CreateTransactionDto) {
    const {
      type,
      amount,
      categoryId,
      note,
      transactionDate,
      source,
      imageUrl,
      merchantName,
      ocrResultId,
    } = dto;
    const { data, error } = await this.supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type,
        amount,
        category_id: categoryId,
        note,
        transaction_date: transactionDate,
        source,
        image_url: imageUrl,
        merchant_name: merchantName,
        ocr_result_id: ocrResultId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findById(id: string, userId: string) {
    const { data, error } = await this.supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(userId: string, queryDto: GetTransactionsQueryDto) {
    const {
      type,
      categoryId,
      fromDate,
      toDate,
      keyword,
      page,
      limit,
      sortBy,
      sortOrder,
    } = queryDto;

    // --- Count query ---
    let countQuery = this.supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (type) countQuery = countQuery.eq("type", type);
    if (categoryId) countQuery = countQuery.eq("category_id", categoryId);
    if (fromDate) countQuery = countQuery.gte("transaction_date", fromDate);
    if (toDate) countQuery = countQuery.lte("transaction_date", toDate);
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
      .eq("user_id", userId)
      .order(safeSortBy, { ascending })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) dataQuery = dataQuery.eq("type", type);
    if (categoryId) dataQuery = dataQuery.eq("category_id", categoryId);
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

  async update(id: string, userId: string, dto: UpdateTransactionDto) {
    const updatePayload: Record<string, any> = {};
    if (dto.type !== undefined) updatePayload.type = dto.type;
    if (dto.amount !== undefined) updatePayload.amount = dto.amount;
    if (dto.categoryId !== undefined)
      updatePayload.category_id = dto.categoryId;
    if (dto.note !== undefined) updatePayload.note = dto.note;
    if (dto.transactionDate !== undefined)
      updatePayload.transaction_date = dto.transactionDate;
    if (dto.merchantName !== undefined)
      updatePayload.merchant_name = dto.merchantName;

    const { data, error } = await this.supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from("transactions")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  /**
   * Returns transactions grouped by date for the last 30 days.
   * NOTE: GROUP BY + json_agg not supported in Supabase JS client.
   * Grouping is done in TypeScript.
   * TODO: Consider a DB RPC/view for better performance on large datasets.
   */
  async getHistory(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .from("transactions")
      .select(
        "id, type, amount, note, merchant_name, transaction_date, categories!category_id(name, icon)",
      )
      .eq("user_id", userId)
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
        amount: rest.amount,
        note: rest.note,
        merchantName: rest.merchant_name,
        categoryName: categories?.name || null,
        categoryIcon: categories?.icon || null,
      });
    }

    return Object.entries(grouped).map(([date, transactions]) => ({
      date,
      transactions,
    }));
  }

  async getSummary(userId: string, queryDto: GetTransactionSummaryQueryDto) {
    const { fromDate, toDate } = queryDto;

    let query = this.supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", userId);

    if (fromDate) query = query.gte("transaction_date", fromDate);
    if (toDate) query = query.lte("transaction_date", toDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let totalIncome = 0;
    let totalExpense = 0;

    for (const row of data || []) {
      const amount = parseFloat(row.amount);
      if (row.type === "income") totalIncome += amount;
      else if (row.type === "expense") totalExpense += amount;
    }

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }
}
