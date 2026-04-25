import { Injectable, Inject } from "@nestjs/common";
import { Pool, QueryResult } from "pg";
import { PG_CONNECTION } from "../../database/database.module";
import {
  CreateTransactionDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";
import {
  GetTransactionsQueryDto,
  GetTransactionSummaryQueryDto,
} from "./dto/get-transactions-query.dto";

@Injectable()
export class TransactionsRepository {
  constructor(@Inject(PG_CONNECTION) private readonly pool: Pool) {}

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
    const result = await this.pool.query(
      `INSERT INTO "transaction".transactions 
        (user_id, type, amount, category_id, note, transaction_date, source, image_url, merchant_name, ocr_result_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        userId,
        type,
        amount,
        categoryId,
        note,
        transactionDate,
        source,
        imageUrl,
        merchantName,
        ocrResultId,
      ],
    );
    return result.rows[0];
  }

  async findById(id: string, userId: string) {
    const result = await this.pool.query(
      'SELECT * FROM "transaction".transactions WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return result.rows[0];
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

    let query = `SELECT t.*, c.name as category_name, c.icon as category_icon FROM "transaction".transactions t
                 LEFT JOIN "transaction".categories c ON t.category_id = c.id
                 WHERE t.user_id = $1`;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND t.type = $${paramIndex++}`;
      params.push(type);
    }
    if (categoryId) {
      query += ` AND t.category_id = $${paramIndex++}`;
      params.push(categoryId);
    }
    if (fromDate) {
      query += ` AND t.transaction_date >= $${paramIndex++}`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND t.transaction_date <= $${paramIndex++}`;
      params.push(toDate);
    }
    if (keyword) {
      query += ` AND (t.note ILIKE $${paramIndex} OR t.merchant_name ILIKE $${paramIndex})`;
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM (${query}) as subquery`,
      params,
    );
    const totalItems = parseInt(countResult.rows[0].count, 10);

    const validSortBy = ["transaction_date", "amount", "created_at"];
    const safeSortBy = validSortBy.includes(sortBy)
      ? sortBy
      : "transaction_date";
    const safeSortOrder = sortOrder === "ASC" ? "ASC" : "DESC";

    query += ` ORDER BY t.${safeSortBy} ${safeSortOrder}, t.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const dataResult = await this.pool.query(query, params);

    return {
      data: dataResult.rows,
      meta: {
        totalItems,
        itemCount: dataResult.rowCount,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto) {
    const { type, amount, categoryId, note, transactionDate, merchantName } =
      dto;
    const result = await this.pool.query(
      `UPDATE "transaction".transactions SET
        type = COALESCE($1, type),
        amount = COALESCE($2, amount),
        category_id = COALESCE($3, category_id),
        note = COALESCE($4, note),
        transaction_date = COALESCE($5, transaction_date),
        merchant_name = COALESCE($6, merchant_name),
        updated_at = NOW()
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [
        type,
        amount,
        categoryId,
        note,
        transactionDate,
        merchantName,
        id,
        userId,
      ],
    );
    return result.rows[0];
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM "transaction".transactions WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return result.rowCount > 0;
  }

  async getHistory(userId: string) {
    const result = await this.pool.query(
      `SELECT 
            DATE(transaction_date) as date, 
            json_agg(
                json_build_object(
                    'id', t.id,
                    'type', t.type,
                    'amount', t.amount,
                    'note', t.note,
                    'merchantName', t.merchant_name,
                    'categoryName', c.name,
                    'categoryIcon', c.icon
                ) ORDER BY t.transaction_date DESC
            ) as transactions
         FROM "transaction".transactions t
         LEFT JOIN "transaction".categories c ON t.category_id = c.id
         WHERE t.user_id = $1
         GROUP BY DATE(transaction_date)
         ORDER BY date DESC
         LIMIT 30`, // Limit to last 30 days of transactions for performance
      [userId],
    );
    return result.rows;
  }

  async getSummary(userId: string, queryDto: GetTransactionSummaryQueryDto) {
    const { fromDate, toDate } = queryDto;
    let query = `
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as "totalIncome",
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as "totalExpense"
        FROM "transaction".transactions
        WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (fromDate) {
      query += ` AND transaction_date >= $${paramIndex++}`;
      params.push(fromDate);
    }
    if (toDate) {
      query += ` AND transaction_date <= $${paramIndex++}`;
      params.push(toDate);
    }

    const result = await this.pool.query(query, params);
    const { totalIncome, totalExpense } = result.rows[0];
    const balance = parseFloat(totalIncome) - parseFloat(totalExpense);

    return {
      totalIncome: parseFloat(totalIncome),
      totalExpense: parseFloat(totalExpense),
      balance,
    };
  }
}
