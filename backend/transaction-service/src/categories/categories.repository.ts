import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { GetCategoriesQueryDto } from "./dto/get-categories-query.dto";

const SCHEMA = process.env.SUPABASE_DB_SCHEMA || "transaction";

@Injectable()
export class CategoriesRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient().schema(SCHEMA);
  }

  async findAll(queryDto: GetCategoriesQueryDto) {
    const { type } = queryDto;
    let query = this.supabase.from("categories").select("*");

    if (type) {
      query = query.eq("type", type);
    }

    query = query.order("name", { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async findById(id: string, _user_id: string) {
    const { data, error } = await this.supabase
      .from("categories")
      .select("id, name, type")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
}
