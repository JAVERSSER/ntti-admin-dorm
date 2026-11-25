import "server-only";
import { z } from "zod";
import { AuthorizationError } from "@/lib/auth";
import { fieldErrors } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

/** Map Postgres / PostgREST errors to admin-friendly messages. */
export function dbErrorMessage(error: { code?: string; message?: string; details?: string } | null): string {
  if (!error) return "Unknown error";
  switch (error.code) {
    case "23505":
      if (error.message?.includes("institutions_code_key")) return "An institution with this code already exists.";
      if (error.message?.includes("institutions_name_key")) return "An institution with this name already exists.";
      if (error.message?.includes("rooms_name_key")) return "A room with this name already exists.";
      if (error.message?.includes("admins_username_key")) return "This username is already taken.";
      if (error.message?.includes("admins_email_key")) return "This email is already used by another administrator.";
      if (error.message?.includes("grades_name_key")) return "A grade with this name already exists.";
      return error.message ?? "Duplicate record.";
    case "23503":
      return "This record is referenced by other data and cannot be removed.";
    case "23514":
      return error.message ?? "A validation rule was violated.";
    case "42501":
      return "You are not authorized to perform this action.";
    case "P0002":
      return error.message ?? "Record not found.";
    default:
      return error.message ?? "Database error";
  }
}

/** Wrap a server action body with uniform auth/validation/DB error handling. */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) {
      return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: fieldErrors(e) };
    }
    console.error("[action]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

export function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {};
  formData.forEach((v, k) => {
    if (!k.startsWith("$ACTION")) obj[k] = v;
  });
  return obj;
}
