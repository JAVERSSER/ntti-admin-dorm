"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface LoginState {
  error?: string;
}

/** Fallback for usernames not found in admins.username (e.g. "admin" → admin@dormpay.local). */
const USERNAME_DOMAIN = "dormpay.local";

/**
 * Look up the admin by username (or email) once, before signing in. The same row
 * tells us whether the account is an active admin, so no second query is needed.
 */
async function findAdmin(login: string): Promise<{ id: string; email: string; is_active: boolean } | null> {
  const query = createServiceClient().from("admins").select("id, email, is_active");
  const { data } = await (login.includes("@") ? query.eq("email", login) : query.eq("username", login)).maybeSingle();
  return data;
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

  const login = parsed.data.email;
  const admin = await findAdmin(login);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: admin?.email ?? (login.includes("@") ? login : `${login}@${USERNAME_DOMAIN}`),
    password: parsed.data.password,
  });
  if (error || !data.user) return { error: "Invalid username or password." };

  // Only active admins may sign in. Usually checked with the row we already have;
  // looked up by account id only if the first lookup missed (e.g. email case differs).
  let active = admin?.id === data.user.id ? admin.is_active : null;
  if (active === null) {
    const { data: row } = await supabase.from("admins").select("is_active").eq("id", data.user.id).maybeSingle();
    active = Boolean(row?.is_active);
  }
  if (!active) {
    await supabase.auth.signOut();
    return { error: "This account does not have administrator access." };
  }

  const next = parsed.data.next;
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/payments");
}

/**
 * Fast sign-out: the login cookies are removed straight away and the admin goes to
 * /login at once; Supabase is told to end the session in the background (after the
 * response), so nobody waits for that network call.
 */
export async function signOut() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession(); // reads the cookie, no network call
  const token = data.session?.access_token;

  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) cookieStore.delete(c.name);
  }

  if (token) {
    after(() =>
      fetch(`${publicEnv.supabaseUrl()}/auth/v1/logout?scope=local`, {
        method: "POST",
        headers: { apikey: publicEnv.supabasePublishableKey(), Authorization: `Bearer ${token}` },
      }).catch(() => {}),
    );
  }
  redirect("/login");
}
