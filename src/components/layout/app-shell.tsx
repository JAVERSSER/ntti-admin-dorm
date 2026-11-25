"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/components/ui/cn";
import { signOut } from "@/app/login/actions";

export function AppShell({
  children,
  admin,
  dormitoryName,
}: {
  children: ReactNode;
  admin: { name: string; email: string; role: string };
  dormitoryName: string;
}) {
  const pathname = usePathname();
  // The drawer is "open" only for the path it was opened on, so navigating closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  const initials = admin.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <Image src="/logo.png" alt="" width={34} height={34} className="rounded-full" priority />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{dormitoryName}</p>
          <p className="truncate text-xs text-slate-500">Admin</p>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <NavIcon icon={Icon} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-slate-200 px-5 py-3 text-[11px] text-slate-400">Administration only</p>
    </nav>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-sm text-slate-500 lg:block">
            {NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-50">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">{admin.name}</p>
                <p className="text-xs text-slate-500">{admin.role === "super_admin" ? "Super admin" : "Administrator"}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {initials}
              </span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

/** The link's icon, swapped for a spinner the moment the link is clicked and while its page loads. */
function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" aria-label="Loading" /> : <Icon className="h-4 w-4 shrink-0" />;
}
