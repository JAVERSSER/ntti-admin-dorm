"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { dbErrorMessage, formToObject, runAction } from "@/lib/actions";
import { editAdminSchema, newAdminSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

/** Set the monthly fee (USD) that every dynamic ABA PayWay KHQR on the payment form asks for. */
export async function updateMonthlyFee(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await assertAdmin();
    const raw = String(formData.get("fee") ?? "").trim().replace(/^\$/, "");
    const fee = Number(raw);
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || !(fee >= 0.01 && fee <= 100000)) {
      return { ok: false, error: "Enter the fee in US dollars, e.g. 45 or 45.50.", fieldErrors: { fee: ["Enter an amount between 0.01 and 100000, at most 2 decimals."] } };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("app_settings").update({ monthly_fee_usd: fee, updated_by: admin.id }).eq("id", 1);
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/settings");
    return { ok: true, message: `Monthly fee set to $${fee.toFixed(2)}. New payment QRs use this amount.` };
  });
}

export async function createAdmin(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin({ superAdmin: true });
    const input = newAdminSchema.parse(formToObject(formData));
    const service = createServiceClient();
    const { data, error } = await service.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });
    if (error || !data.user) return { ok: false, error: error?.message ?? "Could not create user" };

    // Insert through the caller's session so RLS (super admin) and the audit trigger apply.
    const supabase = await createClient();
    const { error: insErr } = await supabase.from("admins").insert({
      id: data.user.id,
      username: input.username,
      email: input.email.toLowerCase(),
      full_name: input.username,
      role: input.role,
    });
    if (insErr) {
      await service.auth.admin.deleteUser(data.user.id);
      return { ok: false, error: dbErrorMessage(insErr) };
    }
    revalidatePath("/settings");
    return { ok: true, message: `Administrator ${input.username} created. Share the password securely.` };
  });
}

export async function setAdminActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin({ superAdmin: true });
    const supabase = await createClient();
    const { error } = await supabase.from("admins").update({ is_active: active }).eq("id", z.uuid().parse(id));
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath("/settings");
    return { ok: true, message: active ? "Administrator activated." : "Administrator deactivated. They can no longer sign in." };
  });
}

/** How many active super admins exist besides `exceptId` (to avoid removing the last one). */
async function otherActiveSuperAdmins(exceptId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("admins")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_active", true)
    .neq("id", exceptId);
  return count ?? 0;
}

export async function updateAdmin(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await assertAdmin({ superAdmin: true });
    const adminId = z.uuid().parse(id);
    const input = editAdminSchema.parse(formToObject(formData));
    const isSelf = adminId === me.id;
    const email = input.email.toLowerCase();

    const supabase = await createClient();
    const { data: current, error: getErr } = await supabase.from("admins").select("*").eq("id", adminId).maybeSingle();
    if (getErr) return { ok: false, error: dbErrorMessage(getErr) };
    if (!current) return { ok: false, error: "Administrator not found." };

    const role = isSelf ? current.role : (input.role ?? current.role);
    if (current.role === "super_admin" && role !== "super_admin" && (await otherActiveSuperAdmins(adminId)) === 0) {
      return { ok: false, error: "At least one active super administrator is required." };
    }

    // Sign-in email and password live in Supabase Auth.
    const service = createServiceClient();
    const emailChanged = email !== current.email;
    if (emailChanged || input.password) {
      const { error } = await service.auth.admin.updateUserById(adminId, {
        ...(emailChanged ? { email, email_confirm: true } : {}),
        ...(input.password ? { password: input.password } : {}),
      });
      if (error) return { ok: false, error: error.message };
    }

    // Profile row through the caller's session so RLS and the audit trigger apply.
    const { error } = await supabase.from("admins").update({ username: input.username, full_name: input.username, email, role }).eq("id", adminId);
    if (error) {
      if (emailChanged) await service.auth.admin.updateUserById(adminId, { email: current.email, email_confirm: true });
      return { ok: false, error: dbErrorMessage(error) };
    }
    revalidatePath("/", "layout");
    return { ok: true, message: input.password ? "Administrator updated and password reset." : "Administrator updated." };
  });
}

export async function deleteAdmin(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await assertAdmin({ superAdmin: true });
    const adminId = z.uuid().parse(id);
    if (adminId === me.id) return { ok: false, error: "You cannot remove your own account." };

    const supabase = await createClient();
    const { data: target } = await supabase.from("admins").select("role, is_active").eq("id", adminId).maybeSingle();
    if (!target) return { ok: false, error: "Administrator not found." };
    if (target.role === "super_admin" && target.is_active && (await otherActiveSuperAdmins(adminId)) === 0) {
      return { ok: false, error: "At least one active super administrator is required." };
    }

    // Delete the profile row under the caller's session (audit log records who did it).
    // If the admins_delete policy migration isn't applied yet, this removes 0 rows and
    // the auth-user delete below removes the row through the foreign-key cascade instead.
    const { error } = await supabase.from("admins").delete().eq("id", adminId);
    if (error) return { ok: false, error: dbErrorMessage(error) };

    const { error: authErr } = await createServiceClient().auth.admin.deleteUser(adminId);
    if (authErr) return { ok: false, error: `Could not delete sign-in account: ${authErr.message}` };

    revalidatePath("/settings");
    return { ok: true, message: "Administrator removed. They can no longer sign in." };
  });
}
