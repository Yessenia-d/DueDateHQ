import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import * as React from "react";

import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

type AuthMode = "login" | "register";
type LoginSearch = { mode: AuthMode };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    mode: search.mode === "register" ? "register" : "login",
  }),
  component: LoginComponent,
});

const defaultDemoCredentials = {
  email: "demo-triage@duedatehq.test",
  password: "DueDateHQ-demo-2026!",
};

function LoginComponent() {
  const search = Route.useSearch();
  const session = useQuery(trpc.auth.session.queryOptions());
  const [mode, setMode] = React.useState<AuthMode>(search.mode);
  const [name, setName] = React.useState("");
  const [firmName, setFirmName] = React.useState("");
  const [email, setEmail] = React.useState(defaultDemoCredentials.email);
  const [password, setPassword] = React.useState(defaultDemoCredentials.password);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session.data) {
      window.location.assign("/dashboard");
    }
  }, [session.data]);

  React.useEffect(() => {
    handleModeChange(search.mode);
  }, [search.mode]);

  function handleModeChange(nextMode: AuthMode) {
    setErrorMessage(null);
    setMode(nextMode);
    if (nextMode === "login") {
      setEmail(defaultDemoCredentials.email);
      setPassword(defaultDemoCredentials.password);
    } else {
      setEmail("");
      setPassword("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email(createSignUpPayload({ email, firmName, name, password }))
          : await authClient.signIn.email({ email, password });

      if (result.error) {
        setErrorMessage(result.error.message ?? "Authentication failed.");
        setIsSubmitting(false);
        return;
      }
    } catch {
      setErrorMessage("Authentication server could not be reached.");
      setIsSubmitting(false);
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <main className="min-h-svh overflow-auto bg-background text-foreground">
      <div className="mx-auto grid min-h-svh w-full min-w-0 max-w-[1000px] grid-cols-[minmax(0,1fr)] content-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(400px,440px)] lg:items-center lg:gap-10 lg:py-12 lg:pb-20">
        <section className="min-w-0 max-w-full border-b border-border pb-5 sm:max-w-[34rem] lg:border-b-0 lg:pb-0">
          <h1 className="text-2xl font-semibold tracking-normal">DueDateHQ</h1>
          <p className="mt-3 max-w-full text-sm leading-6 text-muted-foreground sm:max-w-md">
            Control tax deadline risk for your CPA firm.
          </p>
          <ul className="mt-5 grid gap-2 text-xs text-muted-foreground">
            <WorkspaceCue>Verified IRS and state deadline evidence</WorkspaceCue>
            <WorkspaceCue>One queue for every client filing</WorkspaceCue>
            <WorkspaceCue>AI flags source changes for CPA review</WorkspaceCue>
          </ul>
        </section>

        <section className="w-full min-w-0 max-w-full justify-self-center rounded-[8px] border border-ddhq-border-strong bg-card p-5 shadow-sm sm:max-w-[440px] sm:p-6 lg:justify-self-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Secure firm access</p>
              <h2 id="auth-heading" className="mt-1 text-base font-semibold">
                {mode === "register" ? "Create workspace" : "Log in"}
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full border-ddhq-border-strong/70 bg-background hover:bg-muted focus-visible:ring-primary/25 sm:w-auto sm:min-w-[8.75rem]"
              onClick={() => handleModeChange(mode === "register" ? "login" : "register")}
            >
              {mode === "register" ? (
                <>
                  <LogIn className="size-3.5" />
                  Use login
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  Register
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {mode === "register"
              ? "Set up a Beta workspace for one CPA firm."
              : "Use your DueDateHQ email and password to continue."}
          </p>

          <form aria-labelledby="auth-heading" className="mt-5 grid gap-3" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <Field
                  id="name"
                  label="Name"
                  autoComplete="name"
                  value={name}
                  onChange={setName}
                />
                <Field
                  id="firm-name"
                  label="Firm name"
                  autoComplete="organization"
                  value={firmName}
                  onChange={setFirmName}
                  placeholder="Optional"
                />
              </>
            ) : null}
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={setPassword}
            />

            {errorMessage ? (
              <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 h-10 w-full bg-primary hover:bg-primary/90 focus-visible:ring-primary/25 md:h-9"
            >
              {mode === "register" ? (
                <>
                  <UserPlus className="size-3.5" />
                  Create workspace
                </>
              ) : (
                <>
                  <LogIn className="size-3.5" />
                  Log in
                </>
              )}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

function createSignUpPayload(input: {
  email: string;
  firmName: string;
  name: string;
  password: string;
}) {
  return {
    email: input.email,
    firmName: input.firmName.trim() || undefined,
    name: input.name,
    password: input.password,
  } satisfies Parameters<typeof authClient.signUp.email>[0] & { firmName?: string };
}

function Field({
  autoComplete,
  id,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  autoComplete: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  value: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        required={!placeholder}
        className="h-10 rounded-[6px] border-ddhq-border-strong/65 bg-background text-sm focus-visible:border-primary focus-visible:ring-primary/25 md:h-9 md:text-xs"
      />
    </div>
  );
}

function WorkspaceCue({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex min-h-6 items-center gap-2">
      <span className="size-1.5 shrink-0 rounded-[2px] bg-ddhq-ink-soft" aria-hidden="true" />
      <span className="min-w-0 leading-5">{children}</span>
    </li>
  );
}
