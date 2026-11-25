import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Admin } from "@/lib/types";

/**
 * Data Access Layer: resolves the signed-in admin for this request.
 * Returns null when not signed in or not an active admin.
 */
export const getCurrentAdmin = cache(async (): Promise<Admin | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || !data.is_active) return null;
  return data as Admin;
});

/** For pages/layouts: redirect to login when not an admin. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?error=unauthorized");
  return admin;
}

export class AuthorizationError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function assertAdmin(opts?: { superAdmin?: boolean }): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AuthorizationError();
  if (opts?.superAdmin && admin.role !== "super_admin") {
    throw new AuthorizationError("Only a super administrator can perform this action.");
  }
  return admin;
}
