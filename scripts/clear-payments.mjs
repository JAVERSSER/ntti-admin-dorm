#!/usr/bin/env node
/**
 * Delete ALL payment submissions and their screenshots (payment-slips bucket).
 * Residents, rooms, grades, institutions, settings and admins are not touched.
 *   node --env-file=.env.local scripts/clear-payments.mjs          (dry run: counts only)
 *   node --env-file=.env.local scripts/clear-payments.mjs --yes    (actually delete)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const confirm = process.argv.includes("--yes");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "payment-slips";

// Collect every file path in the bucket (recursing into folders).
async function listAll(prefix = "") {
  const paths = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`List ${prefix || "/"}: ${error.message}`);
    for (const item of data) {
      const p = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) paths.push(...(await listAll(p))); // folder
      else paths.push(p);
    }
    if (data.length < 1000) break;
  }
  return paths;
}

const { count, error: countErr } = await supabase
  .from("payment_submissions")
  .select("id", { count: "exact", head: true });
if (countErr) throw new Error(countErr.message);
const files = await listAll();
console.log(`payment_submissions rows: ${count}`);
console.log(`${BUCKET} files:        ${files.length}`);

if (!confirm) {
  console.log("Dry run. Re-run with --yes to delete.");
  process.exit(0);
}

const { error: delErr } = await supabase
  .from("payment_submissions")
  .delete()
  .not("id", "is", null);
if (delErr) throw new Error(`Delete rows: ${delErr.message}`);

for (let i = 0; i < files.length; i += 100) {
  const { error } = await supabase.storage.from(BUCKET).remove(files.slice(i, i + 100));
  if (error) throw new Error(`Remove files: ${error.message}`);
}

const { count: left } = await supabase
  .from("payment_submissions")
  .select("id", { count: "exact", head: true });
console.log(`Done. Rows left: ${left}, files left: ${(await listAll()).length}`);
