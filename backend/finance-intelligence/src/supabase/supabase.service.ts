import { Injectable } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@shared/supabase/supabase.client";

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = createSupabaseAdminClient();
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
