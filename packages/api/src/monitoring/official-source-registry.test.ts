import assert from "node:assert/strict";
import test from "node:test";

import {
  getOfficialSourceDefinition,
  listOfficialSourceDefinitions,
} from "./official-source-registry";

test("official source registry exposes the P0 allowlist agencies", () => {
  const sources = listOfficialSourceDefinitions();
  const agencyNames = sources.map((source) => source.agencyName).join(" ");

  assert.equal(sources.length, 5);
  assert.ok(agencyNames.includes("Internal Revenue Service"));
  assert.ok(agencyNames.includes("California Franchise Tax Board"));
  assert.ok(agencyNames.includes("New York Tax Department"));
  assert.ok(agencyNames.includes("Texas Comptroller"));
  assert.ok(agencyNames.includes("Florida Department of Revenue"));
  assert.equal(sources.every((source) => source.allowlistLevel === "p0"), true);
  assert.equal(sources.every((source) => source.monitorFrequencyHours === 24), true);
});

test("official source registry rejects unsupported sources", () => {
  assert.equal(getOfficialSourceDefinition("unknown-source"), null);
});
