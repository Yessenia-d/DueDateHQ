import { createDueDateAuth } from "@due-date-hq/api/auth";
import { createContext } from "@due-date-hq/api/context";
import { seedDemoData } from "@due-date-hq/api/lib/demo-seed";
import { appRouter } from "@due-date-hq/api/routers/index";
import { env } from "@due-date-hq/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: (origin, c) => resolveCorsOrigin(origin, c.req.url),
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Demo-Seed-Token"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createDueDateAuth({
    corsOrigin: env.CORS_ORIGIN,
    db: env.DB,
    request: c.req.raw,
    secret: env.BETTER_AUTH_SECRET,
  });

  return auth.handler(c.req.raw);
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.post("/api/demo/seed", async (c) => {
  if (!canSeedDemoData(c.req.raw)) {
    return c.json({ error: "Demo seed is only available from loopback or with a seed token." }, 403);
  }

  try {
    const result = await seedDemoData(env.DB);

    return c.json({
      seeded: true,
      accounts: result.accounts,
      password: result.password,
    });
  } catch (error) {
    console.error("Demo seed failed", error);

    return c.json(
      {
        error: "Demo seed failed.",
        message: error instanceof Error ? error.message : "Unknown seed error.",
      },
      500,
    );
  }
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;

function resolveCorsOrigin(origin: string, requestUrl: string) {
  const configuredOrigins = env.CORS_ORIGIN.split(",")
    .map((allowedOrigin) => allowedOrigin.trim())
    .filter(Boolean);

  if (!configuredOrigins.includes("*")) {
    if (configuredOrigins.includes(origin)) {
      return origin;
    }

    if (isAllowedLoopbackAlias(origin, configuredOrigins)) {
      return origin;
    }

    return null;
  }

  if (isLoopbackOrigin(origin) || isSameOrigin(origin, requestUrl)) {
    return origin;
  }

  return null;
}

function isSameOrigin(origin: string, requestUrl: string) {
  try {
    return origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

function isLoopbackOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname;

    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function isAllowedLoopbackAlias(origin: string, configuredOrigins: string[]) {
  if (!isLoopbackOrigin(origin)) {
    return false;
  }

  try {
    const requested = new URL(origin);

    return configuredOrigins.some((configuredOrigin) => {
      try {
        const configured = new URL(configuredOrigin);

        return isLoopbackOrigin(configured.origin) && configured.port === requested.port;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function canSeedDemoData(request: Request) {
  const token = env.DEMO_SEED_TOKEN.trim();
  const providedToken = request.headers.get("x-demo-seed-token")?.trim();

  if (token && providedToken === token) {
    return true;
  }

  try {
    return isLoopbackOrigin(new URL(request.url).origin);
  } catch {
    return false;
  }
}
