import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { SortableTable } from "@/components/ui/sortable-table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorNotice } from "@/components/ui/empty-state";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { GradeFormButton } from "./grade-form";
import { setGradeActive } from "./actions";
import type { Grade } from "@/lib/types";


export default async function GradesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("grades").select("id, name, sort_order, is_active, created_at").order("sort_order").order("name");
  const rows = (data ?? []) as Grade[];

  return (
    <>
      <PageHeader
        title="Grades"
        description="Active grades appear in the “Grade” list on the payment form, in this order."
        actions={<GradeFormButton />}
      />
      {error && <ErrorNotice message={error.message} />}
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No grades yet" description="Add grades such as Year 1 or C1 so residents can choose theirs." />
        ) : (
          <SortableTable
            columns={[
              { label: "Order", sortable: true, cellClassName: "text-slate-500" },
              { label: "Grade", sortable: true, cellClassName: "font-semibold text-slate-900" },
              { label: "Status", sortable: true },
              { label: "Actions", className: "text-right" },
            ]}
            rows={rows.map((g) => ({
              key: g.id,
              values: [g.sort_order, g.name, g.is_active],
              cells: [
                g.sort_order,
                g.name,
                <StatusBadge key="s" status={g.is_active ? "active" : "inactive"} />,
                <div key="a" className="flex justify-end gap-1">
                  <GradeFormButton grade={g} />
                  <ConfirmAction
                    action={setGradeActive.bind(null, g.id, !g.is_active)}
                    title={g.is_active ? `Hide grade ${g.name}?` : `Show grade ${g.name}?`}
                    description={
                      g.is_active
                        ? "Past payments keep this grade, but it will no longer appear on the payment form."
                        : "The grade will appear on the payment form again."
                    }
                    confirmLabel={g.is_active ? "Hide" : "Show"}
                    confirmVariant={g.is_active ? "danger" : "primary"}
                    variant="ghost"
                  >
                    {g.is_active ? "Hide" : "Show"}
                  </ConfirmAction>
                </div>,
              ],
            }))}
          />
        )}
      </Card>
    </>
  );
}
