import assert from "node:assert/strict";
import test from "node:test";

import type { TaxObligation, TaxRule } from "@due-date-hq/db/schema/tax-rules";

import {
  type FilingProfileForMatching,
  generateDeadlineTasks,
  getTaskGenerationTaxYears,
  matchProfileToRules,
} from "./profile-rule-matcher";

const now = new Date("2026-04-01T00:00:00.000Z");

function makeObligation(overrides: Partial<TaxObligation> & { id: string }): TaxObligation {
  return {
    jurisdiction: "federal",
    jurisdictionLevel: "federal",
    agencyName: "IRS",
    taxCategory: "Income Tax",
    obligationName: "Test Obligation",
    entityTypes: ["individual"],
    knownStatus: "known",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRule(
  overrides: Partial<TaxRule> & { id: string; obligationId: string },
): TaxRule {
  return {
    ruleSummary: "Test rule",
    dueDateRule: {
      type: "fixed",
      month: 4,
      day: 15,
      adjustForWeekendHoliday: true,
    },
    verificationStatus: "verified",
    sourceName: "IRS",
    sourceUrl: "https://irs.gov",
    lastVerifiedAt: now,
    sourceLastCheckedAt: now,
    sourceLastChangedAt: null,
    sourceContentHash: null,
    verifiedBy: "test",
    verificationNotes: null,
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const individualProfile: FilingProfileForMatching = {
  id: "profile-1",
  firmId: "firm-1",
  entityType: "individual",
  jurisdictions: ["federal", "CA"],
};

const cCorpProfile: FilingProfileForMatching = {
  id: "profile-2",
  firmId: "firm-1",
  entityType: "c_corp",
  jurisdictions: ["federal"],
};

// ── matchProfileToRules ──

test("matchProfileToRules matches by jurisdiction and entity type", () => {
  const obligations = [
    makeObligation({
      id: "obl-1",
      jurisdiction: "federal",
      entityTypes: ["individual"],
    }),
    makeObligation({
      id: "obl-2",
      jurisdiction: "CA",
      entityTypes: ["individual"],
    }),
    makeObligation({
      id: "obl-3",
      jurisdiction: "NY",
      entityTypes: ["individual"],
    }),
  ];

  const rules = [
    makeRule({ id: "rule-1", obligationId: "obl-1" }),
    makeRule({ id: "rule-2", obligationId: "obl-2" }),
    makeRule({ id: "rule-3", obligationId: "obl-3" }),
  ];

  const matched = matchProfileToRules(individualProfile, obligations, rules);

  // Profile has jurisdictions ["federal", "CA"], so should match obl-1 and obl-2
  assert.equal(matched.length, 2);
  assert.ok(matched.some((m) => m.rule.id === "rule-1"));
  assert.ok(matched.some((m) => m.rule.id === "rule-2"));
});

test("matchProfileToRules excludes non-matching entity types", () => {
  const obligations = [
    makeObligation({
      id: "obl-1",
      jurisdiction: "federal",
      entityTypes: ["c_corp"],
    }),
  ];

  const rules = [makeRule({ id: "rule-1", obligationId: "obl-1" })];

  const matched = matchProfileToRules(individualProfile, obligations, rules);
  assert.equal(matched.length, 0);
});

test("matchProfileToRules only returns verified rules", () => {
  const obligations = [
    makeObligation({
      id: "obl-1",
      jurisdiction: "federal",
      entityTypes: ["individual"],
    }),
  ];

  const rules = [
    makeRule({
      id: "rule-verified",
      obligationId: "obl-1",
      verificationStatus: "verified",
    }),
    makeRule({
      id: "rule-needs-review",
      obligationId: "obl-1",
      verificationStatus: "needs_review",
    }),
    makeRule({
      id: "rule-source-changed",
      obligationId: "obl-1",
      verificationStatus: "source_changed",
    }),
  ];

  const matched = matchProfileToRules(individualProfile, obligations, rules);
  assert.equal(matched.length, 1);
  assert.equal(matched[0]?.rule.id, "rule-verified");
});

// ── generateDeadlineTasks ──

test("generateDeadlineTasks creates tasks for fixed rules across tax years", () => {
  const obligations = [
    makeObligation({
      id: "obl-1",
      jurisdiction: "federal",
      entityTypes: ["individual"],
      obligationName: "Form 1040",
    }),
  ];

  const rules = [
    makeRule({
      id: "rule-1",
      obligationId: "obl-1",
      dueDateRule: {
        type: "fixed",
        month: 4,
        day: 15,
        adjustForWeekendHoliday: true,
        extensionRule: { month: 10, day: 15, adjustForWeekendHoliday: true },
      },
    }),
  ];

  const matched = matchProfileToRules(individualProfile, obligations, rules);
  const tasks = generateDeadlineTasks(individualProfile, matched, [2025, 2026]);

  assert.equal(tasks.length, 2);

  const task2025 = tasks.find((t) => t.taxYear === 2025);
  assert.ok(task2025);
  assert.equal(task2025.sourceType, "verified_rule");
  assert.equal(task2025.createdVia, "system_rule");
  assert.equal(task2025.filingProfileId, "profile-1");
  assert.equal(task2025.firmId, "firm-1");
  assert.equal(task2025.quarter, null);
  assert.ok(task2025.extensionDate);
});

test("generateDeadlineTasks creates quarterly tasks", () => {
  const obligations = [
    makeObligation({
      id: "obl-es",
      jurisdiction: "federal",
      entityTypes: ["individual"],
      obligationName: "Form 1040-ES",
    }),
  ];

  const rules = [
    makeRule({
      id: "rule-es",
      obligationId: "obl-es",
      dueDateRule: {
        type: "quarterly",
        quarters: {
          q1: { month: 4, day: 15 },
          q2: { month: 6, day: 15 },
          q3: { month: 9, day: 15 },
          q4: { month: 1, day: 15, yearOffset: 1 },
        },
        adjustForWeekendHoliday: true,
      },
    }),
  ];

  const matched = matchProfileToRules(individualProfile, obligations, rules);
  const tasks = generateDeadlineTasks(individualProfile, matched, [2025]);

  assert.equal(tasks.length, 4);
  assert.ok(tasks.some((t) => t.quarter === 1 && t.currentDueDate.getFullYear() === 2025));
  assert.ok(tasks.some((t) => t.quarter === 2 && t.currentDueDate.getFullYear() === 2025));
  assert.ok(tasks.some((t) => t.quarter === 3 && t.currentDueDate.getFullYear() === 2025));
  assert.ok(tasks.some((t) => t.quarter === 4 && t.currentDueDate.getFullYear() === 2026));
});

test("generateDeadlineTasks produces unique uniqueness keys", () => {
  const obligations = [
    makeObligation({
      id: "obl-1",
      jurisdiction: "federal",
      entityTypes: ["individual"],
      obligationName: "Form 1040",
    }),
  ];

  const rules = [
    makeRule({ id: "rule-1", obligationId: "obl-1" }),
  ];

  const matched = matchProfileToRules(individualProfile, obligations, rules);
  const tasks = generateDeadlineTasks(individualProfile, matched, [2025, 2026]);

  const keys = tasks.map((t) => t.uniquenessKey);
  const uniqueKeys = new Set(keys);
  assert.equal(uniqueKeys.size, keys.length, "Uniqueness keys should be unique");
});

// ── getTaskGenerationTaxYears ──

test("getTaskGenerationTaxYears returns current and next year", () => {
  const [current, next] = getTaskGenerationTaxYears(new Date("2026-05-01"));
  assert.equal(current, 2026);
  assert.equal(next, 2027);
});
