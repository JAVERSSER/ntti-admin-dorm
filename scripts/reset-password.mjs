#!/usr/bin/env node
/**
 * Set a new password for an existing administrator (run locally).
 *   node --env-file=.env.local scripts/reset-password.mjs admin@example.com 'NewPassword123'
 */
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/reset-password.mjs <email> <new password>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: admin, error: findErr } = await supabase
  .from("admins")
  .select("id")
  .eq("email", email.toLowerCase())
  .maybeSingle();
if (findErr || !admin) {
  console.error(findErr?.message ?? `No administrator with email ${email}.`);
  process.exit(1);
}
const { error } = await supabase.auth.admin.updateUserById(admin.id, { password });
if (error) {
  console.error("Auth error:", error.message);
  process.exit(1);
}
console.log(`Password updated for ${email}. Sign in at /login.`);
