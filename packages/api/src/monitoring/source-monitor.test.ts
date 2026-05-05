import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoticeCandidatesAllowed,
  detectSourceContentChange,
  getNoticeAlertVisibility,
} from "./source-monitor";

test("detectSourceContentChange treats first successful capture as changed", () => {
  assert.equal(
    detectSourceContentChange({
      status: "success",
      contentHash: "abc",
      previousContentHash: null,
    }),
    true,
  );
});

test("detectSourceContentChange ignores failed checks and unchanged hashes", () => {
  assert.equal(
    detectSourceContentChange({
      status: "failed",
      contentHash: null,
      previousContentHash: "abc",
    }),
    false,
  );
  assert.equal(
    detectSourceContentChange({
      status: "success",
      contentHash: "abc",
      previousContentHash: "abc",
    }),
    false,
  );
});

test("getNoticeAlertVisibility keeps low confidence notices internal", () => {
  assert.equal(
    getNoticeAlertVisibility({
      confidenceLabel: "low",
      hasWorkspaceMatchHints: true,
    }),
    "internal_queue",
  );
  assert.equal(
    getNoticeAlertVisibility({
      confidenceLabel: "medium",
      hasWorkspaceMatchHints: true,
    }),
    "workspace_alert",
  );
  assert.equal(
    getNoticeAlertVisibility({
      confidenceLabel: "high",
      hasWorkspaceMatchHints: false,
    }),
    "internal_queue",
  );
});

test("assertNoticeCandidatesAllowed rejects notices on non-successful checks", () => {
  assert.doesNotThrow(() => assertNoticeCandidatesAllowed("success", 1));
  assert.doesNotThrow(() => assertNoticeCandidatesAllowed("failed", 0));
  assert.throws(() => assertNoticeCandidatesAllowed("failed", 1), /successful source checks/);
  assert.throws(() => assertNoticeCandidatesAllowed("skipped", 1), /successful source checks/);
});
