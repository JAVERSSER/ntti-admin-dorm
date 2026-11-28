import { z } from "zod";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : v);

export const institutionSchema = z.object({
  code: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
    z.string().regex(/^[A-Z0-9_-]{2,20}$/, "2–20 characters: letters, numbers, - or _"),
  ),
  name: z.preprocess(trimmed, z.string().min(2, "Name is too short").max(160)),
  is_active: z.coerce.boolean().default(true),
});

export const roomSchema = z.object({
  name: z.preprocess(trimmed, z.string().min(1, "Room name is required").max(40)),
});

const optionalText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

export const residentSchema = z.object({
  room: z.preprocess(trimmed, z.string().min(1, "Room is required").max(40)),
  full_name: z.preprocess(trimmed, z.string().min(2, "Name is too short").max(120)),
  // Optional so an older CSV without this column leaves degrees as they are.
  degree: optionalText(80).optional(),
  grade: optionalText(40),
  major: optionalText(160),
  institution: optionalText(160),
  note: optionalText(500),
});

export const gradeSchema = z.object({
  name: z.preprocess(trimmed, z.string().min(1, "Grade name is required").max(40)),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
});

export const reviewSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
  admin_note: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
});

const usernameField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z
    .string()
    .min(1, "Enter a username")
    .regex(/^[A-Za-z0-9._-]{3,32}$/, "3–32 characters: letters, numbers, . _ -"),
);

export const newAdminSchema = z.object({
  username: usernameField,
  email: z.email(),
  role: z.enum(["admin", "super_admin"]),
  password: z.string().min(1, "Enter a password"),
});

/** Flatten a ZodError into fieldErrors for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export const editAdminSchema = z.object({
  username: usernameField,
  email: z.email(),
  role: z.enum(["admin", "super_admin"]).optional(),
  password: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional(),
  ),
});
