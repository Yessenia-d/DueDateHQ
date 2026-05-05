import { Button } from "@due-date-hq/ui/components/button";
import { Input } from "@due-date-hq/ui/components/input";
import { Label } from "@due-date-hq/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LogIn, UserPlus } from "lucide-react";
import * as React from "react";

import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/login")({
  component: LoginComponent,
});

type AuthMode = "login" | "register";

function LoginComponent() {
  const session = useQuery(trpc.auth.session.queryOptions());
  const [mode, setMode] = React.useState<AuthMode>("login");
  const [name, setName] = React.useState("");
  const [firmName, setFirmName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session.data) {
      window.location.assign("/");
    }
  }, [session.data]);

  function handleModeChange(nextMode: AuthMode) {
    setErrorMessage(null);
    setMode(nextMode);
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

    window.location.assign("/");
  }

  return (
    <main className="min-h-0 overflow-auto">
      <div className="mx-auto grid min-h-full max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <section className="border-b pb-6 lg:border-b-0 lg:pr-8">
          <div className="mb-3 inline-flex items-center gap-2 border px-2 py-1 text-xs text-muted-foreground">
            <LogIn className="size-3.5" />
            Firm workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">DueDateHQ</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Sign in to the Beta workspace used for client relationships, filing profiles, and
            deadline task work.
          </p>
          <dl className="mt-6 grid gap-3 text-xs sm:grid-cols-3">
            <WorkspaceCue label="Scope" value="Firm-owned data" />
            <WorkspaceCue label="Auth" value="Email/password" />
            <WorkspaceCue label="Boundary" value="Session required" />
          </dl>
        </section>

        <section className="border p-4">
          <div className="grid grid-cols-2 border text-xs">
            <button
              type="button"
              className={`flex h-9 items-center justify-center gap-2 border-r ${
                mode === "login" ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
              onClick={() => handleModeChange("login")}
            >
              <LogIn className="size-3.5" />
              Log in
            </button>
            <button
              type="button"
              className={`flex h-9 items-center justify-center gap-2 ${
                mode === "register" ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
              onClick={() => handleModeChange("register")}
            >
              <UserPlus className="size-3.5" />
              Register
            </button>
          </div>

          <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
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
              <div className="border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
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
      />
    </div>
  );
}

function WorkspaceCue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
