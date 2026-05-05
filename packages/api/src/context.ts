import { createDb } from "@due-date-hq/db";
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
type Firm = Awaited<ReturnType<typeof ensureFirmForUser>>;
type OfficialSourceMonitorTokenEnv = {
  OFFICIAL_SOURCE_MONITOR_TOKEN?: string | null;
};

export type SessionContext = AuthSession & {
  firm: Firm;
};

export type Context = {
  auth: DueDateAuth;
  db: ReturnType<typeof createDb>;
  firm: Firm | null;
  session: SessionContext | null;
  officialSourceMonitorRequestToken?: string | null;
  officialSourceMonitorToken?: string | null;
};

export async function createContext({ context }: CreateContextOptions): Promise<Context> {
  const db = createDb(context.env.DB);
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
  const monitorEnv = context.env as Partial<OfficialSourceMonitorTokenEnv>;

  return {
    auth,
    db,
    firm,
    session: session && firm ? { ...session, firm } : null,
    officialSourceMonitorRequestToken: readMonitorRequestToken(context.req.raw.headers),
    officialSourceMonitorToken: normalizeOptionalText(monitorEnv.OFFICIAL_SOURCE_MONITOR_TOKEN),
  };
}

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

function readMonitorRequestToken(headers: Headers) {
  const explicitToken = normalizeOptionalText(headers.get("x-official-source-monitor-token"));
  if (explicitToken) {
    return explicitToken;
  }

  const authorization = normalizeOptionalText(headers.get("authorization"));
  const bearerToken = /^Bearer\s+(.+)$/i.exec(authorization ?? "")?.[1];

  return normalizeOptionalText(bearerToken);
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
