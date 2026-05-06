#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = path.resolve(__dirname, "../../../packages/db/src/migrations");

export function parseWranglerConfigPath(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--config" || arg === "-c") {
      return args[index + 1] ?? null;
    }

    if (arg.startsWith("--config=")) {
      return arg.slice("--config=".length) || null;
    }
  }

  return null;
}

export function getExpectedMigrationNames(migrationsDir) {
  if (!existsSync(migrationsDir)) {
    throw new Error(`D1 migrations directory does not exist: ${migrationsDir}`);
  }

  return readdirSync(migrationsDir)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
}

export async function runLocalD1MigrationGuard({
  logger = console,
  migrationsDir = defaultMigrationsDir,
  runCommand = runCommandSync,
  wranglerArgs,
}) {
  const configPath = parseWranglerConfigPath(wranglerArgs);
  const configArgs = configPath ? ["--config", configPath] : [];
  const applyArgs = ["d1", "migrations", "apply", "DB", "--local", ...configArgs];

  logger.info("[dev-db] Applying local D1 migrations before starting server...");
  runWranglerOrThrow(runCommand, applyArgs);

  const expectedNames = getExpectedMigrationNames(migrationsDir);
  const appliedNames = await readAppliedMigrationNames(runCommand, configArgs);
  const missingMigrations = expectedNames.filter((name) => !appliedNames.includes(name));

  if (missingMigrations.length > 0) {
    throw new Error(
      [
        "Local D1 schema guard failed: migrations are still missing after apply.",
        `Missing migrations: ${missingMigrations.join(", ")}`,
        `Fix command: ${formatMigrationCommand(configArgs)}`,
      ].join("\n"),
    );
  }

  const deadlineTaskColumns = await readTableColumns(runCommand, configArgs, "deadline_tasks");

  if (!deadlineTaskColumns.includes("entered_deadline_reference_note")) {
    throw new Error(
      [
        "Local D1 schema guard failed: deadline_tasks.entered_deadline_reference_note is missing.",
        `Fix command: ${formatMigrationCommand(configArgs)}`,
      ].join("\n"),
    );
  }

  const updateRecordColumns = await readTableColumns(
    runCommand,
    configArgs,
    "deadline_task_update_records",
  );

  if (!updateRecordColumns.includes("field_name")) {
    throw new Error(
      [
        "Local D1 schema guard failed: deadline_task_update_records.field_name is missing.",
        `Fix command: ${formatMigrationCommand(configArgs)}`,
      ].join("\n"),
    );
  }

  logger.info("[dev-db] Local D1 migrations are current.");
}

function readAppliedMigrationNames(runCommand, configArgs) {
  return readD1Json(runCommand, configArgs, "select name from d1_migrations order by id").then(
    (rows) => rows.map((row) => String(row.name)),
  );
}

function readTableColumns(runCommand, configArgs, tableName) {
  return readD1Json(runCommand, configArgs, `pragma table_info(${tableName})`).then((rows) =>
    rows.map((row) => String(row.name)),
  );
}

async function readD1Json(runCommand, configArgs, command) {
  const result = runWranglerOrThrow(runCommand, [
    "d1",
    "execute",
    "DB",
    "--local",
    ...configArgs,
    "--command",
    command,
    "--json",
  ]);

  const payload = parseJsonFromWranglerOutput(result.stdout);
  const firstResult = Array.isArray(payload) ? payload[0] : payload;
  const rows = firstResult?.results;

  if (!Array.isArray(rows)) {
    throw new Error(`Unexpected wrangler D1 JSON response for command: ${command}`);
  }

  return rows;
}

function parseJsonFromWranglerOutput(output) {
  const lines = output.split(/\r?\n/);
  const startLine = lines.findIndex((line) => {
    const trimmed = line.trimStart();

    return trimmed.startsWith("[") || trimmed.startsWith("{");
  });

  if (startLine < 0) {
    throw new Error(`Wrangler did not return JSON output:\n${output}`);
  }

  return JSON.parse(lines.slice(startLine).join("\n"));
}

function runWranglerOrThrow(runCommand, args) {
  const result = runCommand("wrangler", args);

  if (result.status !== 0) {
    throw new Error(
      [
        `Wrangler command failed: wrangler ${args.join(" ")}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result;
}

function runCommandSync(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, CI: process.env.CI ?? "1" },
  });
}

function formatMigrationCommand(configArgs) {
  return ["wrangler", "d1", "migrations", "apply", "DB", "--local", ...configArgs].join(" ");
}

function startWranglerDev(args) {
  const result = spawnSync("wrangler", ["dev", ...withDefaultEnvFile(args)], {
    env: process.env,
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

export function withDefaultEnvFile(args) {
  if (args.some((arg) => arg === "--env-file" || arg.startsWith("--env-file="))) {
    return args;
  }

  if (!existsSync(path.resolve(__dirname, "../.env"))) {
    return args;
  }

  return ["--env-file", ".env", ...args];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rawArgs = process.argv.slice(2);
  const wranglerArgs = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

  try {
    await runLocalD1MigrationGuard({ wranglerArgs });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  startWranglerDev(wranglerArgs);
}
