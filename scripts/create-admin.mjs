#!/usr/bin/env node
/**
 * Bootstrap the FIRST super administrator (run once, locally).
 *   node --env-file=.env.local scripts/create-admin.mjs admin@example.com "Full Name" 'StrongPassword123'
 * Later admins are created from Settings → Administrators.
 */
import { createClient } from "@supabase/supabase-js";

const [email, fullName, password] = process.argv.slice(2);
if (!email || !fullName || !password) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs <email> "<full name>" <password>');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  console.error("Auth error:", error.message);
  process.exit(1);
}
const { error: insErr } = await supabase
  .from("admins")
  .insert({ id: data.user.id, email: email.toLowerCase(), full_name: fullName, role: "super_admin" });
if (insErr) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error("Could not create admin row:", insErr.message);
  process.exit(1);
}
console.log(`Super admin ${email} created. Sign in at /login.`);
