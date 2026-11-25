"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { dbErrorMessage, formToObject, runAction } from "@/lib/actions";
import { editAdminSchema, newAdminSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

/** Detect the real image type from the first bytes (never trust the browser's MIME type). */
function sniffImage(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

/** Replace the ABA QR image shown on the public payment form. */
export async function uploadPaymentQr(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await assertAdmin();
    const file = formData.get("qr");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image.", fieldErrors: { qr: ["Choose an image."] } };
    if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Image is too large.", fieldErrors: { qr: ["Max 5 MB."] } };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) return { ok: false, error: "Only JPG, PNG or WEBP images.", fieldErrors: { qr: ["Only JPG, PNG or WEBP images."] } };

    const supabase = await createClient();
    const { data: current } = await supabase.from("app_settings").select("payment_qr_path").eq("id", 1).maybeSingle();

    // Storage writes use the service role: the caller is already verified by
    // assertAdmin() above, and this avoids depending on storage.objects RLS
    // policies, which can reject the upload even for a valid admin.
    const storage = createServiceClient().storage.from("payment-qr");

    // New file name every time so browsers/CDN never show a cached old QR.
    const path = `qr-${Date.now()}.${kind.ext}`;
    const up = await storage.upload(path, bytes, { contentType: kind.mime, upsert: false });
    if (up.error) {
      console.error("[uploadPaymentQr] storage upload failed", up.error);
      return { ok: false, error: `Upload failed: ${up.error.message}` };
    }

    const { error } = await supabase.from("app_settings").update({ payment_qr_path: path, updated_by: admin.id }).eq("id", 1);
    if (error) {
      await storage.remove([path]);
      return { ok: false, error: dbErrorMessage(error) };
    }
    if (current?.payment_qr_path && current.payment_qr_path !== path) await storage.remove([current.payment_qr_path]);
    revalidatePath("/settings");
    return { ok: true, message: "QR updated. Residents will see the new QR on the payment form." };
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
    const { error } = await supabase.from("admins").update({ username: input.username, email, role }).eq("id", adminId);
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
