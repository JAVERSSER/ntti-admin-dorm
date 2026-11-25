"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface LoginState {
  error?: string;
}

/** Fallback for usernames not found in admins.username (e.g. "admin" → admin@dormpay.local). */
const USERNAME_DOMAIN = "dormpay.local";

/** Resolve a username to the admin's sign-in email; emails pass through unchanged. */
async function resolveLoginEmail(login: string): Promise<string> {
  if (login.includes("@")) return login;
  const { data } = await createServiceClient().from("admins").select("email").eq("username", login).maybeSingle();
  return data?.email ?? `${login}@${USERNAME_DOMAIN}`;
}

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("login"),
    password: formData.get("secret"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: await resolveLoginEmail(parsed.data.email),
    password: parsed.data.password,
  });
  if (error || !data.user) return { error: "Invalid username or password." };

  // Only active admins may sign in.
  const { data: admin } = await supabase
    .from("admins")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!admin?.is_active) {
    await supabase.auth.signOut();
    return { error: "This account does not have administrator access." };
  }

  const next = parsed.data.next;
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/payments");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
