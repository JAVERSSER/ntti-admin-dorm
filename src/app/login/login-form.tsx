"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ErrorNotice } from "@/components/ui/empty-state";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: initialError });

  return (
    <form action={action} className="space-y-4" autoComplete="off">
      {state.error && <ErrorNotice message={state.error} />}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Username or email" htmlFor="email">
        <Input id="email" name="login" type="text" autoComplete="off" autoCapitalize="none" required autoFocus />
      </Field>
      {/* A text box masked with CSS instead of type="password", so Chrome's
          password manager doesn't treat this as a login and show its
          "password found in a data breach" popup. */}
      <Field label="Password" htmlFor="secret">
        <Input
          id="secret"
          name="secret"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
        />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
