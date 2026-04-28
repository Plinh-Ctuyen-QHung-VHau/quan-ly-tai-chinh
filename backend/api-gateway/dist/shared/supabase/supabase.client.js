"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseAdminClient = createSupabaseAdminClient;
const supabase_js_1 = require("@supabase/supabase-js");
function createSupabaseAdminClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl) {
        throw new Error("SUPABASE_URL is required");
    }
    if (!serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
//# sourceMappingURL=supabase.client.js.map