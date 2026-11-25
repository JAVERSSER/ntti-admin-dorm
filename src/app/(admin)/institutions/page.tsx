import { createClient } from "@/lib/supabase/server";
import { sanitizeSearch, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, THead, TBody, Th, Td, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorNotice } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { InstitutionFormButton } from "./institution-form";
import { setInstitutionActive } from "./actions";
import type { Institution } from "@/lib/types";


export default async function InstitutionsPage({ searchParams }: PageProps<"/institutions">) {
  const sp = await searchParams;
  const q = sanitizeSearch(typeof sp.q === "string" ? sp.q : "");
  const status = typeof sp.status === "string" ? sp.status : "";

  const supabase = await createClient();
  let query = supabase.from("institutions").select("*").order("code");
  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data, error } = await query;
  const rows = (data ?? []) as Institution[];

  return (
    <>
      <PageHeader
        title="Schools"
        description="The schools shown in the “Student at” list on the payment form."
        actions={<InstitutionFormButton />}
      />
      {error && <ErrorNotice message={error.message} />}
      <Card>
        <FilterBar
          searchPlaceholder="Search code or name…"
          filters={[{ name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
        />
        {rows.length === 0 ? (
          <EmptyState title="No schools found" description="Add a school or adjust your search." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((inst) => (
                <Tr key={inst.id}>
                  <Td className="font-mono font-semibold text-slate-900">{inst.code}</Td>
                  <Td className="whitespace-normal">{inst.name}</Td>
                  <Td><StatusBadge status={inst.is_active ? "active" : "inactive"} /></Td>
                  <Td>{formatDate(inst.created_at)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <InstitutionFormButton institution={inst} />
                      <ConfirmAction
                        action={setInstitutionActive.bind(null, inst.id, !inst.is_active)}
                        title={inst.is_active ? `Deactivate ${inst.code}?` : `Activate ${inst.code}?`}
                        description={
                          inst.is_active
                            ? "Past payments keep this school name, but it will no longer appear on the payment form."
                            : "The school will appear on the payment form again."
                        }
                        confirmLabel={inst.is_active ? "Deactivate" : "Activate"}
                        confirmVariant={inst.is_active ? "danger" : "primary"}
                        variant="ghost"
                      >
                        {inst.is_active ? "Deactivate" : "Activate"}
                      </ConfirmAction>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
