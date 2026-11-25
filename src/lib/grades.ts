import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GRADES } from "./format";

/** Grade names in display order (all, or active only). Falls back to the built-in list before the migration runs. */
export async function gradeNames(supabase: SupabaseClient, activeOnly = false): Promise<string[]> {
  let query = supabase.from("grades").select("name").order("sort_order").order("name");
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [...GRADES];
  return data.map((g) => g.name as string);
}
