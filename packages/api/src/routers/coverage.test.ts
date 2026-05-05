import assert from "node:assert/strict";
import test from "node:test";

import { verificationStatuses } from "@due-date-hq/db/schema/tax-rules";

import type { Context } from "../context";
import { appRouter } from "./index";

type WrittenVerificationRequest = {
  firmId?: string;
  requestType?: string;
  obligationId?: string | null;
  taxRuleId?: string | null;
  status?: string;
  message?: string | null;
};

function createMockDb(rows: WrittenVerificationRequest[] = []) {
  return {
    insert: (_table: unknown) => ({
      values: async (row: WrittenVerificationRequest) => {
        rows.push(row);
      },
    }),
  } as unknown as Context["db"];
}

const mockSession = {
  user: {
    id: "user-test",
    email: "cpa@example.com",
    name: "Test CPA",
  },
  firm: {
    id: "firm-test",
    name: "Test Firm",
    ownerUserId: "user-test",
  },
  session: {
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
  },
} as unknown as NonNullable<Context["session"]>;

function createCaller({
  rows = [],
  session = null,
}: {
  rows?: WrittenVerificationRequest[];
  session?: Context["session"];
} = {}) {
  return appRouter.createCaller({
    auth: null as unknown as Context["auth"],
    db: createMockDb(rows),
    firm: session?.firm ?? null,
    session,
  });
}

const caller = createCaller();

// ── coverage.matrix ──

test("coverage.matrix returns grouped obligations with summary", async () => {
  const result = await caller.coverage.matrix();

  assert.ok(result.generatedAt);
  assert.ok(result.groups.length > 0, "Should have at least one jurisdiction group");
  assert.ok(result.summary.totalObligations > 0, "Should have seeded obligations");
  assert.ok(result.summary.jurisdictionCount > 0, "Should have jurisdiction count");
  assert.ok(result.supportedSources.length > 0, "Should list supported sources");
});

test("coverage.matrix includes federal, CA, NY, TX, and FL groups", async () => {
  const result = await caller.coverage.matrix();

  const jurisdictions = result.groups.map((g) => g.jurisdiction);
  assert.ok(jurisdictions.includes("federal"), "Should include federal group");
  assert.ok(jurisdictions.includes("CA"), "Should include CA group");
  assert.ok(jurisdictions.includes("NY"), "Should include NY group");
  assert.ok(jurisdictions.includes("TX"), "Should include TX group");
  assert.ok(jurisdictions.includes("FL"), "Should include FL group");
  assert.equal(result.groups.length, 5, "Should have 5 jurisdiction groups");
});

test("coverage.matrix federal group appears first", async () => {
  const result = await caller.coverage.matrix();

  const first = result.groups[0];
  assert.ok(first);
  assert.equal(first.jurisdiction, "federal");
  assert.equal(first.jurisdictionLevel, "federal");
});

test("coverage.matrix includes verified and non-verified trust states", async () => {
  const result = await caller.coverage.matrix();

  assert.ok(result.summary.totalVerified > 0, "Should include verified rules");
  assert.ok(result.summary.totalNeedsReview > 0, "Should include needs-review rules");
  assert.ok(result.summary.totalSourceChanged > 0, "Should include source-changed rules");
  assert.ok(result.summary.totalUnsupported > 0, "Should include unsupported obligations");
  assert.ok(result.summary.totalNoRule > 0, "Should include coverage gaps");
  assert.ok(
    result.summary.totalVerified < result.summary.totalObligations,
    "Known obligations must not imply complete verified coverage",
  );
});

test("coverage.matrix obligations have required fields", async () => {
  const result = await caller.coverage.matrix();

  const statusSet = new Set<string>(verificationStatuses);

  for (const group of result.groups) {
    for (const obl of group.obligations) {
      assert.ok(obl.obligationId, "Should have obligationId");
      assert.ok(obl.jurisdiction, "Should have jurisdiction");
      assert.ok(obl.obligationName, "Should have obligationName");
      assert.ok(obl.taxCategory, "Should have taxCategory");
      assert.ok(obl.entityTypes.length > 0, "Should have entity types");

      if (obl.verificationStatus) {
        assert.ok(
          statusSet.has(obl.verificationStatus),
          `${obl.obligationName} has valid verification status`,
        );
      }
    }
  }
});

test("coverage.matrix includes IRS obligations", async () => {
  const result = await caller.coverage.matrix();

  const federalGroup = result.groups.find((g) => g.jurisdiction === "federal");
  assert.ok(federalGroup);

  const names = federalGroup.obligations.map((o) => o.obligationName);
  assert.ok(
    names.some((n) => n.includes("1040") && !n.includes("ES")),
    "Should include Form 1040",
  );
  assert.ok(
    names.some((n) => n.includes("1120") && !n.includes("S") && !n.includes("W")),
    "Should include Form 1120",
  );
  assert.ok(names.some((n) => n.includes("1120-S")), "Should include Form 1120-S");
  assert.ok(names.some((n) => n.includes("1065")), "Should include Form 1065");
  assert.ok(names.some((n) => n.includes("1041")), "Should include Form 1041");
  assert.ok(names.some((n) => n.includes("1040-ES")), "Should include Form 1040-ES");
  assert.ok(names.some((n) => n.includes("1120-W")), "Should include Form 1120-W");
});

test("coverage.matrix includes CA FTB obligations", async () => {
  const result = await caller.coverage.matrix();

  const caGroup = result.groups.find((g) => g.jurisdiction === "CA");
  assert.ok(caGroup);

  const names = caGroup.obligations.map((o) => o.obligationName);
  assert.ok(
    names.some((n) => n.includes("540") && !n.includes("ES")),
    "Should include CA Form 540",
  );
  assert.ok(
    names.some((n) => n.includes("100") && !n.includes("S") && !n.includes("ES")),
    "Should include CA Form 100",
  );
  assert.ok(names.some((n) => n.includes("100S")), "Should include CA Form 100S");
  assert.ok(names.some((n) => n.includes("565")), "Should include CA Form 565");
});

test("coverage.matrix includes NY Tax Department obligations", async () => {
  const result = await caller.coverage.matrix();

  const nyGroup = result.groups.find((g) => g.jurisdiction === "NY");
  assert.ok(nyGroup);
  assert.equal(nyGroup.agencyName, "New York Tax Department");

  const names = nyGroup.obligations.map((o) => o.obligationName);
  assert.ok(names.some((n) => n.includes("IT-201")), "Should include Form IT-201");
  assert.ok(names.some((n) => n.includes("CT-3") && !n.includes("CT-3-S")), "Should include Form CT-3");
  assert.ok(names.some((n) => n.includes("CT-3-S")), "Should include Form CT-3-S");
  assert.ok(names.some((n) => n.includes("IT-204")), "Should include Form IT-204");
  assert.ok(names.some((n) => n.includes("IT-2105")), "Should include Form IT-2105");
  assert.ok(names.some((n) => n.includes("CT-400")), "Should include Form CT-400");
  assert.equal(nyGroup.obligations.length, 6, "NY should have 6 obligations");
});

test("coverage.matrix includes TX Comptroller obligations", async () => {
  const result = await caller.coverage.matrix();

  const txGroup = result.groups.find((g) => g.jurisdiction === "TX");
  assert.ok(txGroup);
  assert.equal(txGroup.agencyName, "Texas Comptroller of Public Accounts");

  const names = txGroup.obligations.map((o) => o.obligationName);
  assert.ok(names.some((n) => n.includes("Franchise")), "Should include Franchise Tax");
  assert.ok(names.some((n) => n.includes("Sales")), "Should include Sales & Use Tax");
  assert.equal(txGroup.obligations.length, 2, "TX should have 2 obligations");
});

test("coverage.matrix includes FL DOR obligations", async () => {
  const result = await caller.coverage.matrix();

  const flGroup = result.groups.find((g) => g.jurisdiction === "FL");
  assert.ok(flGroup);
  assert.equal(flGroup.agencyName, "Florida Department of Revenue");

  const names = flGroup.obligations.map((o) => o.obligationName);
  assert.ok(names.some((n) => n.includes("F-1120")), "Should include Form F-1120");
  assert.ok(names.some((n) => n.includes("DR-15")), "Should include Form DR-15");
  assert.ok(names.some((n) => n.includes("RT-6")), "Should include Form RT-6");
  assert.equal(flGroup.obligations.length, 3, "FL should have 3 obligations");
});

test("coverage.matrix keeps gaps and unsupported obligations non-official", async () => {
  const result = await caller.coverage.matrix();
  const items = result.groups.flatMap((g) => g.obligations);

  const partnershipGap = items.find((item) => item.obligationId === "obl-ny-it204");
  assert.ok(partnershipGap);
  assert.equal(partnershipGap.verificationStatus, null);
  assert.equal(partnershipGap.ruleId, null);

  const unsupported = items.find((item) => item.obligationId === "obl-fl-rt6");
  assert.ok(unsupported);
  assert.equal(unsupported.verificationStatus, "unsupported");
  assert.equal(unsupported.ruleId, null);
});

test("coverage.matrix supported sources include P0 agencies", async () => {
  const result = await caller.coverage.matrix();

  const sources = result.supportedSources.join(" ");
  assert.ok(sources.includes("IRS"), "Should mention IRS");
  assert.ok(sources.includes("California"), "Should mention California FTB");
  assert.ok(sources.includes("New York"), "Should mention New York");
  assert.ok(sources.includes("Texas"), "Should mention Texas");
  assert.ok(sources.includes("Florida"), "Should mention Florida");
});

// ── coverage.getRule ──

test("coverage.getRule returns detailed rule evidence", async () => {
  const result = await caller.coverage.getRule({ ruleId: "rule-irs-1040-filing" });

  assert.ok(result);
  assert.equal(result.ruleId, "rule-irs-1040-filing");
  assert.equal(result.verificationStatus, "verified");
  assert.ok(result.obligationName.includes("1040"));
  assert.ok(result.ruleSummary.length > 0);
  assert.ok(result.sourceName);
  assert.ok(result.sourceUrl);
  assert.ok(result.lastVerifiedAt);
  assert.ok(result.currentVersion >= 1);
  assert.ok(result.exampleDueDates.length > 0, "Should have example due dates");
});

test("coverage.getRule returns null for unknown rule", async () => {
  const result = await caller.coverage.getRule({ ruleId: "nonexistent" });
  assert.equal(result, null);
});

test("coverage.getRule example due dates include extension dates for fixed rules", async () => {
  const result = await caller.coverage.getRule({ ruleId: "rule-irs-1040-filing" });
  assert.ok(result);

  // Fixed rule with extension should have extension dates
  for (const ed of result.exampleDueDates) {
    assert.ok(ed.dueDate);
    assert.ok(ed.extensionDate, "1040 filing rule should have extension dates");
    assert.equal(ed.quarter, null, "Fixed rule should not have quarter");
  }
});

test("coverage.getRule example due dates show quarters for quarterly rules", async () => {
  const result = await caller.coverage.getRule({ ruleId: "rule-irs-1040es-quarterly" });
  assert.ok(result);

  assert.ok(result.exampleDueDates.length >= 4, "Quarterly rule should have at least 4 dates");

  const quarters = result.exampleDueDates
    .filter((ed) => ed.quarter !== null)
    .map((ed) => ed.quarter);
  assert.ok(quarters.includes(1));
  assert.ok(quarters.includes(2));
  assert.ok(quarters.includes(3));
  assert.ok(quarters.includes(4));
});

// ── coverage.requestCoverage ──

test("coverage.requestCoverage returns success acknowledgement", async () => {
  const rows: WrittenVerificationRequest[] = [];
  const firmCaller = createCaller({ rows, session: mockSession });

  const result = await firmCaller.coverage.requestCoverage({
    obligationId: "obl-ny-it204",
    message: "Please verify this",
  });

  assert.ok(result.success);
  assert.ok(result.requestId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.firmId, "firm-test");
  assert.equal(rows[0]?.requestType, "user_requested");
  assert.equal(rows[0]?.obligationId, "obl-ny-it204");
  assert.equal(rows[0]?.status, "open");
});

test("coverage.requestCoverage rejects already verified obligations", async () => {
  const firmCaller = createCaller({ session: mockSession });

  await assert.rejects(
    () => firmCaller.coverage.requestCoverage({ obligationId: "obl-irs-1040" }),
    /Verified obligations already have DueDateHQ coverage/,
  );
});

// ── coverage.addUserProvidedDeadlineFromGap ──

test("coverage.addUserProvidedDeadlineFromGap records a manual-deadline intent", async () => {
  const rows: WrittenVerificationRequest[] = [];
  const firmCaller = createCaller({ rows, session: mockSession });

  const result = await firmCaller.coverage.addUserProvidedDeadlineFromGap({
    obligationId: "obl-fl-rt6",
  });

  assert.ok(result.success);
  assert.ok(result.nextPath.includes("coverageObligationId=obl-fl-rt6"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.requestType, "manual_deadline");
  assert.equal(rows[0]?.obligationId, "obl-fl-rt6");
  assert.equal(rows[0]?.status, "open");
});

// ── coverage.dismissGapForNow ──

test("coverage.dismissGapForNow returns success acknowledgement", async () => {
  const rows: WrittenVerificationRequest[] = [];
  const firmCaller = createCaller({ rows, session: mockSession });

  const result = await firmCaller.coverage.dismissGapForNow({
    obligationId: "obl-ny-it204",
  });

  assert.ok(result.success);
  assert.equal(result.status, "closed");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.requestType, "coverage_gap_dismissed");
  assert.equal(rows[0]?.obligationId, "obl-ny-it204");
  assert.equal(rows[0]?.status, "closed");
});
