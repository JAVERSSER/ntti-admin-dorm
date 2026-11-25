"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import type { PayState } from "@/lib/match";

export interface RoomPerson {
  id: string;
  full_name: string;
  degree: string | null;
  major: string | null;
  grade: string | null;
  institution: string | null;
  note: string | null;
  state: PayState;
}

const STATE: Record<PayState, { label: string; tone: "green" | "yellow" | "red" | "gray" }> = {
  paid: { label: "Paid", tone: "green" },
  pending: { label: "Waiting review", tone: "yellow" },
  rejected: { label: "Rejected", tone: "red" },
  unpaid: { label: "Not paid", tone: "gray" },
};

export function RoomPeopleButton({ room, people, monthLabel }: { room: string; people: RoomPerson[]; monthLabel: string }) {
  const [open, setOpen] = useState(false);
  const paid = people.filter((p) => p.state === "paid").length;

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={people.length === 0}>
        <Users className="h-3.5 w-3.5" />
        {people.length === 0 ? "Empty" : `${people.length} ${people.length === 1 ? "person" : "people"}`}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Room ${room}`}
        description={`${people.length} living here · ${paid} paid for ${monthLabel}`}
        size="lg"
        footer={
          <>
            <Link
              href={`/residents?room=${encodeURIComponent(room)}`}
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Open in Residents
            </Link>
            <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
          </>
        }
      >
        <ul className="divide-y divide-slate-100">
          {people.map((p, i) => {
            const st = STATE[p.state];
            const detail = [p.degree, p.major, p.grade].filter(Boolean).join(" · ");
            return (
              <li key={p.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 w-5 shrink-0 text-right text-xs text-slate-400">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">{p.full_name}</div>
                    {(detail || p.institution) && (
                      <div className="text-xs text-slate-500">{[detail, p.institution].filter(Boolean).join(" — ")}</div>
                    )}
                    {p.note && <div className="text-xs italic text-slate-400">{p.note}</div>}
                  </div>
                </div>
                <Badge tone={st.tone}>{st.label}</Badge>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
