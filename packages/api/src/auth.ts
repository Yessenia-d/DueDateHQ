import { createDb, type D1DatabaseBinding } from "@due-date-hq/db";
import {
  account,
  session,
  user,
  verification,
} from "@due-date-hq/db/schema/auth";
import type { Firm, NewFirm } from "@due-date-hq/db/schema/firms";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export type BetterAuthUser = {
  email: string;
  id: string;
  name: string;
};

export type CreateDueDateAuthOptions = {
  corsOrigin: string;
  db: D1DatabaseBinding;
  request: Request;
  secret?: string | undefined;
};

const authSchema = {
  account,
  session,
  user,
  verification,
};

export function createDueDateAuth({
  corsOrigin,
  db,
  request,
  secret,
}: CreateDueDateAuthOptions) {
  const secureRequest = isSecureRequest(request);

  return betterAuth({
    appName: "DueDateHQ",
    basePath: "/api/auth",
    baseURL: new URL(request.url).origin,
    database: drizzleAdapter(createDb(db), {
      provider: "sqlite",
      schema: authSchema,
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            const createdUserWithFirm = createdUser as BetterAuthUser & { firmName?: unknown };
            const firmName = typeof createdUserWithFirm.firmName === "string"
              ? createdUserWithFirm.firmName
              : undefined;

            await ensureFirmForUser(db, createdUser, firmName);
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      maxPasswordLength: 256,
      minPasswordLength: 8,
    },
    secret,
    trustedOrigins: getTrustedOrigins(corsOrigin, request),
    user: {
      additionalFields: {
        firmName: {
          type: "string",
          required: false,
          returned: false,
        },
      },
    },
    advanced: {
      cookiePrefix: "ddhq",
      defaultCookieAttributes: secureRequest
        ? {
            partitioned: true,
            sameSite: "none",
            secure: true,
          }
        : {
            sameSite: "lax",
          },
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
      },
      useSecureCookies: secureRequest,
    },
  });
}

export type DueDateAuth = ReturnType<typeof createDueDateAuth>;

export async function ensureFirmForUser(
  db: D1DatabaseBinding,
  firmOwner: BetterAuthUser,
  firmName?: string | null,
) {
  const existingFirm = await findFirmByOwnerUserId(db, firmOwner.id);

  if (existingFirm) {
    return existingFirm;
  }

  const now = new Date();
  const firm: NewFirm = {
    id: crypto.randomUUID(),
    name: firmName?.trim() || `${firmOwner.name}'s firm`,
    ownerUserId: firmOwner.id,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db
      .prepare(
        `
          INSERT INTO firms (id, name, owner_user_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `,
      )
      .bind(
        firm.id,
        firm.name,
        firm.ownerUserId,
        toTimestamp(firm.createdAt),
        toTimestamp(firm.updatedAt),
      )
      .run();

    return firm;
  } catch {
    const resolvedFirm = await findFirmByOwnerUserId(db, firmOwner.id);

    if (!resolvedFirm) {
      throw new Error("Unable to create or resolve firm workspace");
    }

    return resolvedFirm;
  }
}

function getTrustedOrigins(corsOrigin: string, request: Request) {
  const origin = request.headers.get("Origin");
  const configuredOrigins = parseAllowedOrigins(corsOrigin);

  if (origin && configuredOrigins.has(origin)) {
    return [...configuredOrigins, origin];
  }

  if (origin && isAllowedLoopbackAlias(origin, configuredOrigins)) {
    return [...configuredOrigins, origin];
  }

  if (origin && corsOrigin.trim() === "*" && isLoopbackOrigin(origin)) {
    return [origin];
  }

  return [...configuredOrigins];
}

function parseAllowedOrigins(corsOrigin: string) {
  return new Set(
    corsOrigin
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0 && origin !== "*"),
  );
}

function isSecureRequest(request: Request) {
  const url = new URL(request.url);

  return (
    url.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    request.headers.get("x-forwarded-protocol") === "https"
  );
}

function isLoopbackOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname;

    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function isAllowedLoopbackAlias(origin: string, configuredOrigins: Set<string>) {
  if (!isLoopbackOrigin(origin)) {
    return false;
  }

  try {
    const requested = new URL(origin);

    for (const configuredOrigin of configuredOrigins) {
      try {
        const configured = new URL(configuredOrigin);

        if (isLoopbackOrigin(configured.origin) && configured.port === requested.port) {
          return true;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return false;
  }

  return false;
}

async function findFirmByOwnerUserId(db: D1DatabaseBinding, ownerUserId: string) {
  const row = await db
    .prepare(
      `
        SELECT id, name, owner_user_id AS ownerUserId, created_at AS createdAt, updated_at AS updatedAt
        FROM firms
        WHERE owner_user_id = ?
        LIMIT 1
      `,
    )
    .bind(ownerUserId)
    .first<FirmRow>();

  return row ? mapFirm(row) : undefined;
}

type FirmRow = {
  createdAt: number;
  id: string;
  name: string;
  ownerUserId: string;
  updatedAt: number;
};

function mapFirm(row: FirmRow): Firm {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.ownerUserId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toTimestamp(value: Date | number | string) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  return new Date(value).getTime();
}
