import { Injectable, Inject } from "@nestjs/common";
import { Pool } from "pg";
import { PG_CONNECTION } from "../database/database.module";
import { GetCategoriesQueryDto } from "./dto/get-categories-query.dto";

@Injectable()
export class CategoriesRepository {
  constructor(@Inject(PG_CONNECTION) private readonly pool: Pool) {}

  async findAll(userId: string, queryDto: GetCategoriesQueryDto) {
    const { type } = queryDto;
    let query =
      'SELECT id, name, type, icon, created_at, updated_at FROM "transaction".categories WHERE user_id = $1 OR user_id IS NULL';
    const params: any[] = [userId];

    if (type) {
      query += " AND type = $2";
      params.push(type);
    }

    query += " ORDER BY name ASC";

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findById(id: string, userId: string) {
    const result = await this.pool.query(
      'SELECT id, name, type FROM "transaction".categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [id, userId],
    );
    return result.rows[0];
  }
}
