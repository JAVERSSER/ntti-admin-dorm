import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("dormitory_name").eq("id", 1).maybeSingle();

  return (
    <AppShell
      admin={{ name: admin.username || admin.full_name, email: admin.email, role: admin.role }}
      dormitoryName={settings?.dormitory_name ?? "Dormitory"}
    >
      {children}
    </AppShell>
  );
}
