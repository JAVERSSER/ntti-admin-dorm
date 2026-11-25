import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <p className="text-sm font-semibold text-blue-600">404</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Record not found</h2>
      <p className="mt-2 text-sm text-slate-500">It may have been removed, or the link is incorrect.</p>
      <Link href="/payments" className={buttonClasses("secondary", "md", "mt-6")}>Back to payments</Link>
    </div>
  );
}
