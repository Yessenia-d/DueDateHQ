import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { D1Database } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("due-date-hq");
const betterAuthSecret = alchemy.secret(process.env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET");

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DB: db,
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
    BETTER_AUTH_SECRET: betterAuthSecret,
    DEMO_SEED_TOKEN: process.env.DEMO_SEED_TOKEN ?? "",
  },
  dev: {
    port: 3000,
  },
});

export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: {
    directory: "dist",
    run_worker_first: true,
  },
  bindings: {
    VITE_SERVER_URL: server.url!,
  },
  script: `
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);

    if (response.status !== 404) {
      return response;
    }

    const url = new URL(request.url);

    if (request.method === "GET" && !url.pathname.includes(".")) {
      return env.ASSETS.fetch(new Request(new URL("/", request.url), request));
    }

    return response;
  },
};
`,
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
