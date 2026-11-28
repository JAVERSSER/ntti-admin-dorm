"use client";

import { useState } from "react";
import { BadgeCheck, ExternalLink, ImageOff } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import type { PaymentSubmission } from "@/lib/types";

type Props = {
  submission: PaymentSubmission;
  imageUrl: string | null;
  forMonth: string;
  submittedAt: string;
  reviewedAt: string | null;
};

export function SubmissionCard({ submission: s, imageUrl, forMonth, submittedAt, reviewedAt }: Props) {
  const [open, setOpen] = useState(false);
  const amount = s.amount != null ? `${Number(s.amount).toFixed(2)} ${s.currency ?? "USD"}` : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from Supabase Storage
            <img src={imageUrl} alt={`Payment screenshot from ${s.student_name}`} loading="lazy" className="h-full w-full object-cover object-top transition group-hover:scale-[1.02]" />
          ) : s.payway_tran_id ? (
            <PaywayBadge amount={amount} />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400"><ImageOff className="h-8 w-8" /></div>
          )}
          <span className="absolute left-2 top-2"><StatusBadge status={s.status} /></span>
        </div>
        <div className="space-y-0.5 p-3">
          <p className="truncate font-semibold text-slate-900">{s.student_name}</p>
          <p className="truncate text-xs text-slate-600">Room {s.room} · {s.grade}</p>
          <p className="truncate text-xs text-slate-500">{s.institution}</p>
          <p className="truncate pt-1 text-xs font-medium text-blue-700">For {forMonth}</p>
          <p className="pt-1 text-[11px] text-slate-400">{submittedAt}</p>
        </div>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={`${s.student_name} — Room ${s.room}`}
        description={<>Reference <span className="font-mono font-semibold text-slate-700">{s.reference}</span></>}
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-2">
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                <img src={imageUrl} alt="Payment screenshot" className="max-h-[60vh] w-auto rounded-lg border border-slate-200" />
                <a href={imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                  Open full size <ExternalLink className="h-3 w-3" />
                </a>
              </>
            ) : s.payway_tran_id ? (
              <div className="aspect-[3/4] w-full max-w-xs overflow-hidden rounded-lg border border-slate-200">
                <PaywayBadge amount={amount} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Image not available.</p>
            )}
          </div>
          <div className="space-y-5">
            <dl className="divide-y divide-slate-100 border-b border-slate-100 text-sm">
              {[
                ["Status", <StatusBadge key="s" status={s.status} />],
                ["Paying for", forMonth],
                ...(amount ? [["Amount", amount]] : []),
                ...(s.payway_tran_id ? [["PayWay transaction", <span key="tx" className="font-mono text-xs">{s.payway_tran_id}</span>]] : []),
                ...(s.payway_apv ? [["APV", <span key="apv" className="font-mono text-xs">{s.payway_apv}</span>]] : []),
                ["Student name", s.student_name],
                ["Room", s.room],
                ["Grade", s.grade],
                ["Student at", s.institution],
                ["Submitted", <span key="t" className="whitespace-nowrap">{submittedAt}</span>],
                ["Reviewed", <span key="r" className="whitespace-nowrap">{reviewedAt ?? "—"}</span>],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="shrink-0 whitespace-nowrap text-slate-500">{label}</dt>
                  <dd className="min-w-0 text-right font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            {s.admin_note && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-700">Note</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{s.admin_note}</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Shown instead of a screenshot for payments confirmed by ABA PayWay. */
function PaywayBadge({ amount }: { amount: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-emerald-50 p-4 text-center text-emerald-800">
      <BadgeCheck className="h-10 w-10" />
      <p className="text-sm font-semibold">Paid with ABA KHQR</p>
      {amount && <p className="text-lg font-bold">{amount}</p>}
      <p className="text-[11px] text-emerald-700">Confirmed by ABA PayWay</p>
    </div>
  );
}
