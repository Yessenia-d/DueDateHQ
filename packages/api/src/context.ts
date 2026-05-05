import type { Context as HonoContext } from "hono";
import { TRPCError } from "@trpc/server";

import {
  createDueDateAuth,
  ensureFirmForUser,
  type DueDateAuth,
} from "./auth";

export type CreateContextOptions = {
  context: HonoContext;
};

type AuthSession = NonNullable<Awaited<ReturnType<DueDateAuth["api"]["getSession"]>>>;

export type SessionContext = AuthSession & {
  firm: Awaited<ReturnType<typeof ensureFirmForUser>>;
};

export async function createContext({ context }: CreateContextOptions) {
  const auth = createDueDateAuth({
    corsOrigin: String(context.env.CORS_ORIGIN ?? ""),
    db: context.env.DB,
    request: context.req.raw,
    secret: context.env.BETTER_AUTH_SECRET,
  });
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  const firm = session
    ? await ensureFirmForUser(context.env.DB, session.user)
    : null;

  return {
    auth,
    firm,
    session: session && firm ? { ...session, firm } : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

export const protectedProcedureGuard = requireFirmSession;

export function requireFirmSession(context: Pick<Context, "session">) {
  if (!context.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to access this firm workspace.",
    });
  }

  return context.session;
}
