import assert from "node:assert/strict";
import test from "node:test";

import { extractOfficialNoticeImpactConditions } from "./official-notice-extractor";

const source = {
  id: "irs-federal-deadlines-relief",
  jurisdiction: "federal",
  agencyName: "Internal Revenue Service",
  sourceType: "html",
  sourceUrl: "https://www.irs.gov/",
  allowlistLevel: "p0",
  deadlineScope: "Federal tax deadline changes.",
  monitorFrequencyHours: 24,
  active: true,
} as const;

test("extractOfficialNoticeImpactConditions returns structured explainable confidence", () => {
  const result = extractOfficialNoticeImpactConditions({
    source,
    noticeTitle: "Tax relief for disaster victims",
    noticeText:
      "The IRS postponed filing and payment deadlines for individuals and businesses to October 15, 2026.",
  });

  assert.equal(result.confidenceLabel, "high");
  assert.equal(result.deadlineRelevance, "high");
  assert.ok(result.confidenceReasons.length > 0);
  assert.equal(result.confidenceReasons.some((reason) => reason.includes("%")), false);
  assert.equal(result.impactConditions[0]?.jurisdiction, "federal");
  assert.ok(result.impactConditions[0]?.deadlineKinds.includes("filing"));
  assert.ok(result.impactConditions[0]?.deadlineKinds.includes("payment"));
  assert.ok(result.workspaceMatchHints.entityTypes.includes("individual"));
});
