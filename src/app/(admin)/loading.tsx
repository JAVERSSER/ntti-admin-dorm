// Fallback for any admin page without its own loading.tsx: header + a card with a table.
import { SkeletonCard, SkeletonHeader, SkeletonPage, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard>
        <SkeletonTable cols={["w-20", "w-40", "w-16", "w-24"]} />
      </SkeletonCard>
    </SkeletonPage>
  );
}
