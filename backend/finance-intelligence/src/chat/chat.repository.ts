import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

const FINANCE_SCHEMA = process.env.SUPABASE_DB_SCHEMA || "finance";

@Injectable()
export class ChatRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient().schema(FINANCE_SCHEMA);
  }

  async createSession(user_id: string, title?: string) {
    const { data, error } = await this.supabase
      .from("chat_sessions")
      .insert({
        user_id,
        title: title || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getSession(session_id: string) {
    const { data, error } = await this.supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async saveMessage(params: {
    session_id: string;
    sender_type: "user" | "assistant";
    content: string;
    intent?: string;
    entities_json?: Record<string, any>;
  }) {
    const { data, error } = await this.supabase
      .from("chat_messages")
      .insert({
        session_id: params.session_id,
        sender_type: params.sender_type,
        content: params.content,
        intent: params.intent,
        entities_json: params.entities_json,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getUserSessions(user_id: string) {
    const { data, error } = await this.supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async getSessionMessages(session_id: string) {
    const { data, error } = await this.supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  async getLatestSession(user_id: string) {
    const { data, error } = await this.supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
}
