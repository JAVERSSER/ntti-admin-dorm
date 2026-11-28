import { Bone, SkeletonCard, SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/ui/skeleton";

function CardTitle({ button = false }: { button?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="space-y-2">
        <Bone className="h-4 w-24" />
        <Bone className="h-3 w-72 max-w-[60vw] bg-slate-100" />
      </div>
      {button && <div className="h-10 w-28 rounded-lg bg-blue-200/70" />}
    </div>
  );
}

// Payment card (current fee + fee form), then the Administrators table.
export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader buttons={0} />
      <SkeletonCard>
        <CardTitle />
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start">
          <div className="flex h-32 w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 sm:w-56">
            <Bone className="h-3 w-20 bg-slate-200/60" />
            <Bone className="h-8 w-24" />
          </div>
          <div className="w-full space-y-3 sm:max-w-sm">
            <Bone className="h-4 w-32" />
            <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50" />
            <div className="h-10 w-24 rounded-lg bg-blue-200/70" />
          </div>
        </div>
      </SkeletonCard>
      <SkeletonCard className="mt-6">
        <CardTitle button />
        <SkeletonTable cols={["w-20", "w-40", "w-16", "w-20", "w-16", "w-28"]} rows={3} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
