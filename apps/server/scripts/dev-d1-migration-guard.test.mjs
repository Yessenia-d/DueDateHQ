import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getExpectedMigrationNames,
  parseWranglerConfigPath,
  runLocalD1MigrationGuard,
} from "./dev-d1-migration-guard.mjs";

test("parseWranglerConfigPath reads split and equals config flags", () => {
  assert.equal(parseWranglerConfigPath(["--config", "/tmp/wrangler.toml"]), "/tmp/wrangler.toml");
  assert.equal(parseWranglerConfigPath(["--config=/tmp/wrangler.toml"]), "/tmp/wrangler.toml");
  assert.equal(parseWranglerConfigPath(["--port", "3000"]), null);
});

test("getExpectedMigrationNames returns sorted SQL migration filenames", () => {
  const dir = makeTempMigrations(["0001_second.sql", "0000_first.sql", "notes.txt"]);

  try {
    assert.deepEqual(getExpectedMigrationNames(dir), ["0000_first.sql", "0001_second.sql"]);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("runLocalD1MigrationGuard applies local migrations before validating schema", async () => {
  const dir = makeTempMigrations(["0000_first.sql", "0001_second.sql"]);
  const calls = [];

  try {
    await runLocalD1MigrationGuard({
      logger: silentLogger,
      migrationsDir: dir,
      runCommand: (_command, args) => {
        calls.push(args);

        if (args.includes("apply")) {
          return { status: 0, stdout: "No migrations to apply", stderr: "" };
        }

        const sql = args[args.indexOf("--command") + 1];

        if (sql.includes("d1_migrations")) {
          return wranglerJson([{ name: "0000_first.sql" }, { name: "0001_second.sql" }]);
        }

        if (sql.includes("deadline_task_update_records")) {
          return wranglerJson([{ name: "id" }, { name: "field_name" }]);
        }

        return wranglerJson([{ name: "id" }, { name: "entered_deadline_reference_note" }]);
      },
      wranglerArgs: ["--config", "/tmp/wrangler.toml", "--port", "3000", "--local"],
    });

    assert.deepEqual(calls[0]?.slice(0, 5), ["d1", "migrations", "apply", "DB", "--local"]);
    assert.ok(calls.some((args) => args.includes("select name from d1_migrations order by id")));
    assert.ok(calls.some((args) => args.includes("pragma table_info(deadline_tasks)")));
    assert.ok(
      calls.some((args) => args.includes("pragma table_info(deadline_task_update_records)")),
    );
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("runLocalD1MigrationGuard fails fast with missing schema columns and fix command", async () => {
  const dir = makeTempMigrations(["0000_first.sql"]);

  try {
    await assert.rejects(
      () =>
        runLocalD1MigrationGuard({
          logger: silentLogger,
          migrationsDir: dir,
          runCommand: (_command, args) => {
            if (args.includes("apply")) {
              return { status: 0, stdout: "No migrations to apply", stderr: "" };
            }

            const sql = args[args.indexOf("--command") + 1];

            if (sql.includes("d1_migrations")) {
              return wranglerJson([{ name: "0000_first.sql" }]);
            }

            if (sql.includes("deadline_task_update_records")) {
              return wranglerJson([{ name: "id" }, { name: "field_name" }]);
            }

            return wranglerJson([{ name: "id" }]);
          },
          wranglerArgs: ["--config", "/tmp/wrangler.toml", "--local"],
        }),
      /deadline_tasks\.entered_deadline_reference_note[\s\S]*wrangler d1 migrations apply DB --local --config \/tmp\/wrangler\.toml/,
    );
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

test("runLocalD1MigrationGuard fails fast when task update record table is missing", async () => {
  const dir = makeTempMigrations(["0000_first.sql"]);

  try {
    await assert.rejects(
      () =>
        runLocalD1MigrationGuard({
          logger: silentLogger,
          migrationsDir: dir,
          runCommand: (_command, args) => {
            if (args.includes("apply")) {
              return { status: 0, stdout: "No migrations to apply", stderr: "" };
            }

            const sql = args[args.indexOf("--command") + 1];

            if (sql.includes("d1_migrations")) {
              return wranglerJson([{ name: "0000_first.sql" }]);
            }

            if (sql.includes("deadline_task_update_records")) {
              return wranglerJson([]);
            }

            return wranglerJson([{ name: "id" }, { name: "entered_deadline_reference_note" }]);
          },
          wranglerArgs: ["--config", "/tmp/wrangler.toml", "--local"],
        }),
      /deadline_task_update_records\.field_name[\s\S]*wrangler d1 migrations apply DB --local --config \/tmp\/wrangler\.toml/,
    );
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});

const silentLogger = {
  info() {},
  warn() {},
};

function makeTempMigrations(names) {
  const dir = mkdtempSync(path.join(tmpdir(), "ddhq-migrations-"));

  for (const name of names) {
    writeFileSync(path.join(dir, name), "-- migration\n");
  }

  return dir;
}

function wranglerJson(results) {
  return {
    status: 0,
    stderr: "",
    stdout: JSON.stringify([{ results, success: true, meta: { duration: 0 } }]),
  };
}
