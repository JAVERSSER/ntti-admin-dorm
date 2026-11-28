import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, THead, TBody, Th, Td, Tr } from "@/components/ui/table";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ErrorNotice } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EditAdminButton, MonthlyFeeForm, NewAdminButton } from "./forms";
import { deleteAdmin, setAdminActive } from "./actions";
import type { Admin, AppSettings } from "@/lib/types";


export default async function SettingsPage() {
  const supabase = await createClient();
  const [me, { data: settings, error }, { data: admins }] = await Promise.all([
    requireAdmin(),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("admins").select("*").order("created_at"),
  ]);
  const isSuper = me.role === "super_admin";
  const fee = (settings as AppSettings | null)?.monthly_fee_usd;
  const monthlyFee = fee == null ? null : Number(fee);

  return (
    <>
      <PageHeader title="Settings" description="Monthly fee and administrator access." />
      {error && <ErrorNotice message={error.message} />}

      <Card>
        <CardHeader
          title="Payment"
          description="Residents pay with a one-time ABA PayWay KHQR for this amount. Payments are confirmed automatically and show as approved."
        />
        <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex w-full shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 p-6 sm:w-56">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current fee</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{monthlyFee ? `$${monthlyFee.toFixed(2)}` : "Not set"}</p>
            {!monthlyFee && <p className="mt-2 text-center text-xs text-amber-700">Residents cannot pay until a fee is set.</p>}
          </div>
          <div className="w-full sm:max-w-sm">
            <MonthlyFeeForm fee={monthlyFee} />
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Administrators"
          description={isSuper ? "Only administrators can sign in." : "Only super administrators can manage this list."}
          actions={isSuper && <NewAdminButton />}
        />
        <Table>
          <THead>
            <tr><Th>Username</Th><Th>Email</Th><Th>Password</Th><Th>Role</Th><Th>Status</Th><Th>Since</Th>{isSuper && <Th className="text-right">Actions</Th>}</tr>
          </THead>
          <TBody>
            {((admins ?? []) as Admin[]).map((a) => (
              <Tr key={a.id}>
                <Td className="font-medium text-slate-900">{a.username ?? "—"}{a.id === me.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}</Td>
                <Td>{a.email}</Td>
                <Td><span className="font-mono tracking-widest text-slate-400" title="Passwords are stored encrypted and cannot be shown. Use Edit to set a new one.">••••••••</span></Td>
                <Td>{a.role === "super_admin" ? <Badge tone="purple">Super admin</Badge> : <Badge tone="blue">Admin</Badge>}</Td>
                <Td><StatusBadge status={a.is_active ? "active" : "inactive"} /></Td>
                <Td>{formatDateTime(a.created_at)}</Td>
                {isSuper && (
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                    <EditAdminButton admin={a} isSelf={a.id === me.id} />
                    {a.id !== me.id && (
                      <ConfirmAction
                        action={setAdminActive.bind(null, a.id, !a.is_active)}
                        title={a.is_active ? `Deactivate ${a.username}?` : `Activate ${a.username}?`}
                        confirmLabel={a.is_active ? "Deactivate" : "Activate"}
                        confirmVariant={a.is_active ? "danger" : "primary"}
                        variant="ghost"
                      >
                        {a.is_active ? "Deactivate" : "Activate"}
                      </ConfirmAction>
                    )}
                    {a.id !== me.id && (
                      <ConfirmAction
                        action={deleteAdmin.bind(null, a.id)}
                        title={`Remove ${a.username}?`}
                        description="This permanently deletes their account and sign-in. Payments they reviewed stay, but no longer show who reviewed them. To block sign-in temporarily, use Deactivate instead."
                        confirmLabel="Remove"
                        confirmVariant="danger"
                        variant="ghost"
                      >
                        <span className="text-red-600">Remove</span>
                      </ConfirmAction>
                    )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
