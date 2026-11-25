import Image from "next/image";
import { LoginForm } from "./login-form";


const ERRORS: Record<string, string> = {
  unauthorized: "Your session has expired or you do not have administrator access.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="" width={72} height={72} className="rounded-full" priority />
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Dormitory Administration</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage dormitory payments</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm next={next} initialError={error} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Authorized administrators only. All actions are logged.</p>
      </div>
    </div>
  );
}
