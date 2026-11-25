import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES RLS — server-only.
 * Used exclusively for:
 *   - applying bank-verified ABA results (apply_aba_result)
 *   - recording inbound webhook events
 *   - creating admin auth users (super admin only)
 *   - writing the payment QR image to Storage (after assertAdmin)
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(publicEnv.supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
