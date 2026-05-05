import assert from "node:assert/strict";
import test from "node:test";

import {
  createDashboardCsv,
  filterAndSortDashboardRows,
  groupDashboardRows,
  type DashboardTaskRow,
} from "./dashboard";

function makeRow(overrides: Partial<DashboardTaskRow>): DashboardTaskRow {
  return {
    id: "task-base",
    clientRelationship: {
      id: "client-base",
      displayName: "Base Client",
      notes: "Call before filing.",
      relationshipType: "business",
    },
    filingProfile: {
      id: "profile-base",
      displayName: "Base profile",
      ein: "12-3456789",
      entityType: "s_corp",
      ssnLast4: null,
      states: ["CA"],
    },
    title: "Form 1120-S Filing",
    jurisdiction: "federal",
    taxCategory: "Income Tax",
    currentDueDate: "2026-05-08",
    originalDueDate: "2026-03-15",
    firmTargetDate: null,
    hasOriginalDueDate: true,
    hasDateHistory: true,
    isExtended: false,
    daysRemaining: 3,
    status: "not_started",
    priority: "normal",
    sourceType: "verified_rule",
    verificationStatus: "verified",
    verificationLabel: "Verified",
    urgency: "due_this_week",
    horizon: "due_this_week",
    smartPriorityScore: 770,
    sourceName: "IRS",
    sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s",
    enteredDeadlineReferenceNote: null,
    lastVerifiedAt: "2026-04-01T00:00:00.000Z",
    sourceLastCheckedAt: "2026-04-01T00:00:00.000Z",
    sourceLastChangedAt: null,
    ...overrides,
  };
}

test("dashboard groups rows into dashboard horizons", () => {
  const rows = [
    makeRow({ id: "overdue", horizon: "overdue", urgency: "overdue", daysRemaining: -2 }),
    makeRow({ id: "week", horizon: "due_this_week", urgency: "due_today", daysRemaining: 0 }),
    makeRow({ id: "month", horizon: "this_month", urgency: "due_this_month", daysRemaining: 15 }),
    makeRow({ id: "long", horizon: "long_range", urgency: "long_range", daysRemaining: 40 }),
  ];

  const sections = groupDashboardRows(rows);

  assert.deepEqual(
    sections.map((section) => [section.id, section.count]),
    [
      ["overdue", 1],
      ["due_this_week", 1],
      ["this_month", 1],
      ["long_range", 1],
    ],
  );
});

test("dashboard filters by core CPA triage fields", () => {
  const rows = [
    makeRow({
      id: "verified-ca",
      clientRelationship: {
        id: "client-ca",
        displayName: "California Client",
        notes: null,
        relationshipType: "business",
      },
      filingProfile: {
        id: "profile-ca",
        displayName: "California S Corp",
        ein: "12-3456789",
        entityType: "s_corp",
        ssnLast4: null,
        states: ["CA"],
      },
      jurisdiction: "CA",
      verificationStatus: "verified",
    }),
    makeRow({
      id: "manual-ny",
      clientRelationship: {
        id: "client-ny",
        displayName: "New York Client",
        notes: "Waiting on organizer.",
        relationshipType: "business",
      },
      filingProfile: {
        id: "profile-ny",
        displayName: "New York LLC",
        ein: "98-7654321",
        entityType: "llc",
        ssnLast4: null,
        states: ["NY"],
      },
      title: "NY franchise tax payment",
      jurisdiction: "NY",
      horizon: "this_month",
      urgency: "due_this_month",
      sourceType: "entered_deadline",
      verificationStatus: "entered_deadline",
      status: "waiting_on_client",
      taxCategory: "Franchise Tax",
    }),
  ];

  const filtered = filterAndSortDashboardRows(rows, {
    horizon: "this_month",
    sort: "smart_priority",
    clientRelationshipId: "client-ny",
    filingProfileId: "profile-ny",
    obligation: "NY franchise tax payment",
    jurisdiction: "NY",
    entityType: "llc",
    taskStatus: "waiting_on_client",
    taxCategory: "Franchise Tax",
    verificationStatus: "entered_deadline",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, "manual-ny");
});

test("dashboard smart priority sort is deterministic", () => {
  const rows = [
    makeRow({ id: "later-high", currentDueDate: "2026-05-09", smartPriorityScore: 820 }),
    makeRow({ id: "today-normal", currentDueDate: "2026-05-05", smartPriorityScore: 950 }),
    makeRow({ id: "later-high-b", currentDueDate: "2026-05-08", smartPriorityScore: 820 }),
  ];

  const sorted = filterAndSortDashboardRows(rows, {
    horizon: "all",
    sort: "smart_priority",
  });

  assert.deepEqual(
    sorted.map((row) => row.id),
    ["today-normal", "later-high-b", "later-high"],
  );
});

test("dashboard export keeps official due date and firm target date separate", () => {
  const csv = createDashboardCsv([
    makeRow({
      id: "export-row",
      currentDueDate: "2026-05-05",
      firmTargetDate: "2026-05-01",
      isExtended: true,
    }),
  ]);

  assert.match(csv, /Current official due date,Original due date,Firm target date/);
  assert.match(csv, /2026-05-05/);
  assert.match(csv, /2026-03-15/);
  assert.match(csv, /2026-05-01/);
  assert.match(csv, /Extended/);
});

test("dashboard export labels entered deadlines with reference notes", () => {
  const csv = createDashboardCsv([
    makeRow({
      id: "entered-row",
      sourceName: "Reference",
      sourceType: "entered_deadline",
      verificationLabel: "Entered deadline - Not verified by DueDateHQ",
      verificationStatus: "entered_deadline",
      enteredDeadlineReferenceNote: "Prior-year workpaper and CPA judgment.",
    }),
  ]);

  assert.match(csv, /Entered deadline - Not verified by DueDateHQ/);
  assert.match(csv, /Reference/);
  assert.match(csv, /Prior-year workpaper and CPA judgment/);
  assert.doesNotMatch(csv, /User provided/);
});
