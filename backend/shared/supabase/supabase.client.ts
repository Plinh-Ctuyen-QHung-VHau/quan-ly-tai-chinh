import { createClient } from "@supabase/supabase-js";

/**
 * Tạo instance Supabase Admin bằng service role key (bỏ qua RLS).
 * NEVER log or expose the key.
 */
export function createSupabaseAdminClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error("Thiếu cấu hình SUPABASE_URL trong file .env");
    }
    if (!serviceRoleKey) {
        throw new Error("Thiếu cấu hình SUPABASE_SERVICE_ROLE_KEY trong file .env");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
