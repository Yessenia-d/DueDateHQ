import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { createDb, type D1DatabaseBinding } from "@due-date-hq/db";
import { auditLogs } from "@due-date-hq/db/schema/audit";
import { account, user } from "@due-date-hq/db/schema/auth";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTaskUpdateRecords,
  deadlineTasks,
  filingProfiles,
} from "@due-date-hq/db/schema/deadline-domain";
import { firms } from "@due-date-hq/db/schema/firms";
import {
  duplicateCandidates,
  importBatches,
  importReviewItems,
  relationshipSuggestions,
} from "@due-date-hq/db/schema/imports";
import {
  officialNotices,
  officialSources,
  sourceCheckRuns,
  sourceSnapshots,
} from "@due-date-hq/db/schema/monitoring";
import {
  noticeImpactProposals,
  noticeProposalActions,
} from "@due-date-hq/db/schema/notice-proposals";
import {
  taxObligations,
  taxRules,
  verificationRequests,
} from "@due-date-hq/db/schema/tax-rules";

import { getSeedObligations, getSeedRules } from "./seed-tax-data";

export const DEMO_PASSWORD = "DueDateHQ-demo-2026!";
export const DEMO_ACCOUNT_AVATAR_URL = "/avatars/cpa-avatar.jpg";

export const DEMO_ACCOUNTS = [
  {
    slug: "triage",
    email: "demo-triage@duedatehq.test",
    name: "Demo Triage CPA",
    firmName: "Greenfield Triage CPAs",
    userId: "demo-user-triage",
    accountId: "demo-account-triage",
    firmId: "demo-firm-triage",
    intent: "Dashboard horizons, verified official deadlines, firm target dates, and export.",
  },
  {
    slug: "coverage",
    email: "demo-coverage@duedatehq.test",
    name: "Demo Coverage CPA",
    firmName: "Multi-State Coverage CPAs",
    userId: "demo-user-coverage",
    accountId: "demo-account-coverage",
    firmId: "demo-firm-coverage",
    intent: "Coverage gaps, unsupported profiles, verification requests, and entered deadlines.",
  },
  {
    slug: "notices",
    email: "demo-notices@duedatehq.test",
    name: "Demo Notices CPA",
    firmName: "Notice Review CPAs",
    userId: "demo-user-notices",
    accountId: "demo-account-notices",
    firmId: "demo-firm-notices",
    intent: "Source-changed rules, official notice audit trail, and due-date history.",
  },
] as const;

const DEMO_SEEDED_AT = new Date("2026-05-05T12:00:00.000Z");
const DEMO_TRIAGE_STARTED_AT = new Date("2026-02-03T12:00:00.000Z");
const DEMO_TRIAGE_DUE_THIS_WEEK_TARGET = 200;
const DEMO_TRIAGE_BASE_DUE_THIS_WEEK_TASK_COUNT = 8;

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];
type DemoSlug = DemoAccount["slug"];
type IdentityOverride = Partial<Record<DemoSlug, { userId: string; firmId: string }>>;

export type DemoSeedPlan = ReturnType<typeof buildDemoSeedPlan>;

const DEADLINE_TASKS_INDEX_COMPATIBILITY_STATEMENTS = [
  "CREATE INDEX IF NOT EXISTS deadline_tasks_firm_due_date_idx ON deadline_tasks(firm_id, current_due_date)",
  "CREATE INDEX IF NOT EXISTS deadline_tasks_firm_status_idx ON deadline_tasks(firm_id, status)",
  "CREATE INDEX IF NOT EXISTS deadline_tasks_firm_priority_idx ON deadline_tasks(firm_id, priority)",
  "CREATE INDEX IF NOT EXISTS deadline_tasks_client_relationship_idx ON deadline_tasks(client_relationship_id)",
  "CREATE INDEX IF NOT EXISTS deadline_tasks_filing_profile_idx ON deadline_tasks(filing_profile_id)",
  "CREATE INDEX IF NOT EXISTS deadline_tasks_tax_rule_idx ON deadline_tasks(tax_rule_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS deadline_tasks_firm_id_id_unique ON deadline_tasks(firm_id, id)",
] as const;

export function needsReadyToWorkStatusCompatibilityPatch(createTableSql: string | null | undefined) {
  return Boolean(
    createTableSql?.includes("deadline_tasks_status_check") &&
      !createTableSql.includes("ready_to_work"),
  );
}

export function adaptDemoSeedPlanForDeadlineTaskStatusCompatibility(
  plan: DemoSeedPlan,
  options: { readyToWorkSupported: boolean },
) {
  if (options.readyToWorkSupported) {
    return plan;
  }

  return {
    ...plan,
    deadlineTaskUpdateRecords: plan.deadlineTaskUpdateRecords.map((record) =>
      record.newValue === "ready_to_work" ? { ...record, newValue: "in_progress" } : record,
    ),
    deadlineTasks: plan.deadlineTasks.map((taskRow) =>
      taskRow.status === "ready_to_work" ? { ...taskRow, status: "in_progress" } : taskRow,
    ),
  } satisfies DemoSeedPlan;
}

function demoAccountCreatedAt(account: DemoAccount, fallback: Date) {
  return account.slug === "triage" ? DEMO_TRIAGE_STARTED_AT : fallback;
}

export function buildDemoSeedPlan({
  identities = {},
  now = DEMO_SEEDED_AT,
  passwordHash,
}: {
  identities?: IdentityOverride;
  now?: Date;
  passwordHash: string;
}) {
  const identity = (account: DemoAccount) => ({
    userId: identities[account.slug]?.userId ?? account.userId,
    firmId: identities[account.slug]?.firmId ?? account.firmId,
  });
  const users = DEMO_ACCOUNTS.map((account) => ({
    id: identity(account).userId,
    name: account.name,
    email: account.email,
    emailVerified: true,
    image: DEMO_ACCOUNT_AVATAR_URL,
    firmName: account.firmName,
    createdAt: demoAccountCreatedAt(account, now),
    updatedAt: now,
  })) satisfies Array<typeof user.$inferInsert>;
  const accounts = DEMO_ACCOUNTS.map((account) => ({
    id: account.accountId,
    accountId: identity(account).userId,
    providerId: "credential",
    userId: identity(account).userId,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: passwordHash,
    createdAt: demoAccountCreatedAt(account, now),
    updatedAt: now,
  })) satisfies Array<typeof account.$inferInsert>;
  const firmRows = DEMO_ACCOUNTS.map((account) => ({
    id: identity(account).firmId,
    name: account.firmName,
    ownerUserId: identity(account).userId,
    createdAt: demoAccountCreatedAt(account, now),
    updatedAt: now,
  })) satisfies Array<typeof firms.$inferInsert>;

  return {
    accounts,
    auditLogs: [
      auditLog(identity(DEMO_ACCOUNTS[2]).firmId, "demo-notices-audit-relief", {
        action: "notice_proposal.accept",
        entityId: "demo-notices-task-irs-relief",
        sourceId: "demo-notice-irs-disaster-relief",
        sourceType: "official_notice",
        afterState: {
          currentDueDate: "2026-10-15",
          priorDueDate: "2026-04-15",
        },
        metadata: {
          decision: "accepted",
          proposalType: "official_relief_change",
        },
      }),
      auditLog(identity(DEMO_ACCOUNTS[2]).firmId, "demo-notices-audit-decide-later", {
        action: "notice_proposal.decide_later",
        entityId: "demo-notices-task-tx-sales",
        sourceId: "demo-notice-tx-sales-source-change",
        sourceType: "official_notice",
        afterState: {
          decision: "decide_later",
          currentDueDateUnchanged: true,
        },
        metadata: {
          decision: "decide_later",
          proposalType: "source_changed_review",
        },
      }),
    ] satisfies Array<typeof auditLogs.$inferInsert>,
    clientRelationships: [
      client("demo-firm-triage", "demo-triage-client-hawthorne", "Hawthorne Advisory Group", "business", "Imported from TaxDome for dashboard triage."),
      client("demo-firm-triage", "demo-triage-client-rivera", "Rivera Household", "household", "High-touch individual return with estimates."),
      client("demo-firm-triage", "demo-triage-client-summit", "Summit Ridge Partners", "business", "Partnership with extension history."),
      client("demo-firm-triage", "demo-triage-client-chen", "Chen Consulting Inc.", "business", "New York corporate profile with unverified rule coverage."),
      client("demo-firm-triage", "demo-triage-client-barton", "Barton Retail Group", "business", "Multi-state retail client with sales tax source-change review."),
      client("demo-firm-triage", "demo-triage-client-alameda", "Alameda Family Trust", "individual", "Trust profile with entered deadlines and federal fiduciary filings."),
      client("demo-firm-triage", "demo-triage-client-oakpine", "Oak & Pine Dental", "business", "Florida corporation with completed and upcoming filings."),
      client("demo-firm-coverage", "demo-coverage-client-lakeview", "Lakeview Studio LLC", "business", "Multi-state client with unsupported local exposure."),
      client("demo-firm-coverage", "demo-coverage-client-orchid", "Orchid Trust", "individual", "Trust profile missing verified state rule coverage."),
      client("demo-firm-coverage", "demo-coverage-client-northstar", "Northstar Retail", "business", "Sales tax and franchise tax review items."),
      client("demo-firm-notices", "demo-notices-client-gulf", "Gulf Coast Holdings", "business", "Affected by disaster relief notice."),
      client("demo-firm-notices", "demo-notices-client-lonestar", "Lone Star Market", "business", "Texas sales tax source changed review."),
    ].map(remapFirm(identities)) satisfies Array<typeof clientRelationships.$inferInsert>,
    deadlineDateEvents: [
      dateEvent(identity(DEMO_ACCOUNTS[0]).firmId, "demo-triage-event-1120s-extension", {
        auditLogId: null,
        deadlineTaskId: "demo-triage-task-1120s",
        eventType: "official_extension",
        previousCurrentDueDate: "2026-03-16",
        newCurrentDueDate: "2026-09-15",
        sourceName: "IRS",
        sourceUrl: "https://www.irs.gov/forms-pubs/about-form-1120-s",
        notes: "Official extension recorded for demo triage history.",
      }),
      dateEvent(identity(DEMO_ACCOUNTS[0]).firmId, "demo-triage-event-tx-sales-extension", {
        auditLogId: null,
        deadlineTaskId: "demo-triage-task-barton-tx-sales",
        eventType: "official_extension",
        previousCurrentDueDate: "2026-05-05",
        newCurrentDueDate: "2026-05-07",
        sourceName: "Texas Comptroller",
        sourceUrl: "https://comptroller.texas.gov/taxes/sales/",
        notes: "Official extension added so the dashboard due-this-week view demonstrates extended due date handling.",
      }),
      dateEvent(identity(DEMO_ACCOUNTS[2]).firmId, "demo-notices-event-irs-relief", {
        auditLogId: "demo-notices-audit-relief",
        deadlineTaskId: "demo-notices-task-irs-relief",
        eventType: "official_relief_change",
        previousCurrentDueDate: "2026-04-15",
        newCurrentDueDate: "2026-10-15",
        sourceName: "IRS disaster relief notice",
        sourceUrl: "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations",
        notes: "Notice proposal accepted by the CPA for affected profiles.",
      }),
    ] satisfies Array<typeof deadlineDateEvents.$inferInsert>,
    deadlineTaskUpdateRecords: [
      taskUpdateRecord(identity(DEMO_ACCOUNTS[0]).firmId, "demo-triage-update-1040-status", {
        action: "deadline_task.update_status",
        deadlineTaskId: "demo-triage-task-1040",
        fieldName: "status",
        previousValue: "not_started",
        newValue: "waiting_on_client",
        createdAt: new Date("2026-05-02T15:30:00.000Z"),
      }),
      taskUpdateRecord(identity(DEMO_ACCOUNTS[0]).firmId, "demo-triage-update-540-status", {
        action: "deadline_task.update_status",
        deadlineTaskId: "demo-triage-task-540",
        fieldName: "status",
        previousValue: "not_started",
        newValue: "in_progress",
        createdAt: new Date("2026-05-03T16:00:00.000Z"),
      }),
      taskUpdateRecord(identity(DEMO_ACCOUNTS[0]).firmId, "demo-triage-update-hawthorne-notes", {
        action: "client_relationship.update_notes",
        deadlineTaskId: "demo-triage-task-hawthorne-100es-q1",
        fieldName: "notes",
        previousValue: "Imported from TaxDome for dashboard triage.",
        newValue: "Imported from TaxDome for dashboard triage. Partner asked for Q1 estimate follow-up.",
        createdAt: new Date("2026-05-04T14:15:00.000Z"),
      }),
      taskUpdateRecord(identity(DEMO_ACCOUNTS[0]).firmId, "demo-triage-update-100es-target", {
        action: "deadline_task.update_firm_target_date",
        deadlineTaskId: "demo-triage-task-hawthorne-100es-q1",
        fieldName: "firmTargetDate",
        previousValue: "2026-04-30",
        newValue: "2026-05-02",
        createdAt: new Date("2026-05-04T18:45:00.000Z"),
      }),
      taskUpdateRecord(identity(DEMO_ACCOUNTS[0]).firmId, "demo-triage-update-barton-status", {
        action: "deadline_task.update_status",
        deadlineTaskId: "demo-triage-task-barton-tx-sales",
        fieldName: "status",
        previousValue: "waiting_on_client",
        newValue: "ready_to_work",
        createdAt: new Date("2026-05-05T09:00:00.000Z"),
      }),
    ] satisfies Array<typeof deadlineTaskUpdateRecords.$inferInsert>,
    deadlineTasks: [
      task("demo-firm-triage", "demo-triage-task-1040", "demo-triage-client-rivera", "demo-triage-profile-rivera-1040", "rule-irs-1040-filing", "Form 1040 Filing", "federal", "Income tax", "2026-05-01", "2026-04-15", "2026-04-25", "waiting_on_client", "urgent"),
      task("demo-firm-triage", "demo-triage-task-540", "demo-triage-client-rivera", "demo-triage-profile-rivera-1040", "rule-ca-540-filing", "CA Form 540 Filing", "CA", "Income tax", "2026-05-05", "2026-04-15", "2026-05-01", "in_progress", "high"),
      task("demo-firm-triage", "demo-triage-task-1120s", "demo-triage-client-hawthorne", "demo-triage-profile-hawthorne-1120s", "rule-irs-1120s-filing", "Form 1120-S Filing", "federal", "Income tax", "2026-09-15", "2026-03-16", "2026-09-01", "ready_to_work", "normal"),
      task("demo-firm-triage", "demo-triage-task-100s", "demo-triage-client-hawthorne", "demo-triage-profile-hawthorne-1120s", "rule-ca-100s-filing", "CA Form 100S Filing", "CA", "Franchise tax", "2026-05-20", "2026-03-16", "2026-05-13", "not_started", "normal"),
      task("demo-firm-triage", "demo-triage-task-1065", "demo-triage-client-summit", "demo-triage-profile-summit-1065", "rule-irs-1065-filing", "Form 1065 Filing", "federal", "Income tax", "2026-10-15", "2026-03-16", "2026-10-01", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-summit-565", "demo-triage-client-summit", "demo-triage-profile-summit-1065", "rule-ca-565-filing", "CA Form 565 Filing", "CA", "Franchise tax", "2026-05-09", "2026-03-16", "2026-05-06", "in_progress", "high"),
      task("demo-firm-triage", "demo-triage-task-rivera-1040es-q2", "demo-triage-client-rivera", "demo-triage-profile-rivera-1040", "rule-irs-1040es-quarterly", "Form 1040-ES Q2 Payment", "federal", "Estimated tax", "2026-06-15", "2026-06-15", "2026-06-08", "ready_to_work", "normal"),
      task("demo-firm-triage", "demo-triage-task-rivera-540es-q2", "demo-triage-client-rivera", "demo-triage-profile-rivera-1040", "rule-ca-540es-quarterly", "CA Form 540-ES Q2 Payment", "CA", "Estimated tax", "2026-05-10", "2026-06-15", "2026-05-08", "waiting_on_client", "high"),
      task("demo-firm-triage", "demo-triage-task-hawthorne-1120w-q2", "demo-triage-client-hawthorne", "demo-triage-profile-hawthorne-1120s", "rule-irs-1120w-quarterly", "Form 1120-W Q2 Payment", "federal", "Estimated tax", "2026-06-15", "2026-06-15", "2026-06-05", "ready_to_work", "normal"),
      task("demo-firm-triage", "demo-triage-task-hawthorne-100es-q1", "demo-triage-client-hawthorne", "demo-triage-profile-hawthorne-1120s", "rule-ca-100es-quarterly", "CA Form 100-ES Q1 Payment", "CA", "Estimated tax", "2026-05-05", "2026-04-15", "2026-05-02", "in_progress", "urgent"),
      task("demo-firm-triage", "demo-triage-task-chen-ct3", "demo-triage-client-chen", "demo-triage-profile-chen-ct3", "rule-ny-ct3-filing", "NY CT-3 Filing", "NY", "Franchise tax", "2026-05-08", "2026-03-16", "2026-05-06", "not_started", "high"),
      task("demo-firm-triage", "demo-triage-task-chen-ct400-q2", "demo-triage-client-chen", "demo-triage-profile-chen-ct3", "rule-ny-ct400-quarterly", "NY CT-400 Q2 Payment", "NY", "Estimated tax", "2026-06-15", "2026-06-15", "2026-06-07", "not_started", "normal"),
      task("demo-firm-triage", "demo-triage-task-rivera-1040es-q1-done", "demo-triage-client-rivera", "demo-triage-profile-rivera-1040", "rule-irs-1040es-quarterly", "Form 1040-ES Q1 Payment", "federal", "Estimated tax", "2026-05-06", "2026-04-15", "2026-05-01", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-summit-565-estimate-done", "demo-triage-client-summit", "demo-triage-profile-summit-1065", "rule-ca-565-filing", "CA Form 565 estimate review", "CA", "Franchise tax", "2026-05-06", "2026-05-06", "2026-05-04", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-barton-tx-sales", "demo-triage-client-barton", "demo-triage-profile-barton-sales", "rule-tx-sales-quarterly", "TX Sales and Use Tax Q2", "TX", "Sales tax", "2026-05-07", "2026-05-05", "2026-05-06", "ready_to_work", "urgent"),
      task("demo-firm-triage", "demo-triage-task-barton-tx-franchise", "demo-triage-client-barton", "demo-triage-profile-barton-sales", "rule-tx-franchise-filing", "TX Franchise Tax Filing", "TX", "Franchise tax", "2026-05-15", "2026-05-15", "2026-05-10", "in_progress", "high"),
      task("demo-firm-triage", "demo-triage-task-barton-fl-sales", "demo-triage-client-barton", "demo-triage-profile-barton-fl-sales", "rule-fl-sales-quarterly", "FL Sales and Use Tax Q2", "FL", "Sales tax", "2026-05-11", "2026-07-20", "2026-05-08", "not_started", "normal"),
      enteredTask("demo-firm-triage", "demo-triage-task-alameda-entered-estimate", "demo-triage-client-alameda", "demo-triage-profile-alameda-1041", "Trust beneficiary estimate package", "CA", "Income tax", "2026-05-12", "2026-05-09", "Reference: trustee email and prior-year workpaper estimate cadence."),
      task("demo-firm-triage", "demo-triage-task-alameda-1041", "demo-triage-client-alameda", "demo-triage-profile-alameda-1041", "rule-irs-1041-filing", "Form 1041 Filing", "federal", "Income tax", "2026-09-30", "2026-04-15", "2026-09-15", "not_started", "normal"),
      task("demo-firm-triage", "demo-triage-task-oakpine-fl-1120", "demo-triage-client-oakpine", "demo-triage-profile-oakpine-1120", "rule-fl-f1120-filing", "FL F-1120 Filing", "FL", "Income tax", "2026-05-01", "2026-05-01", "2026-04-25", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-oakpine-1120w-q2", "demo-triage-client-oakpine", "demo-triage-profile-oakpine-1120", "rule-irs-1120w-quarterly", "Form 1120-W Q2 Payment", "federal", "Estimated tax", "2026-05-11", "2026-06-15", "2026-05-08", "ready_to_work", "low"),
      task("demo-firm-triage", "demo-triage-task-hawthorne-100s-done", "demo-triage-client-hawthorne", "demo-triage-profile-hawthorne-1120s", "rule-ca-100s-filing", "CA Form 100S prior filing", "CA", "Franchise tax", "2026-04-30", "2026-03-16", "2026-04-22", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-chen-ct400-q1-done", "demo-triage-client-chen", "demo-triage-profile-chen-ct3", "rule-ny-ct400-quarterly", "NY CT-400 Q1 Payment", "NY", "Estimated tax", "2026-04-30", "2026-04-15", "2026-04-24", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-barton-tx-sales-q1-done", "demo-triage-client-barton", "demo-triage-profile-barton-sales", "rule-tx-sales-quarterly", "TX Sales and Use Tax Q1", "TX", "Sales tax", "2026-04-30", "2026-04-20", "2026-04-18", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-barton-fl-sales-q1-done", "demo-triage-client-barton", "demo-triage-profile-barton-fl-sales", "rule-fl-sales-quarterly", "FL Sales and Use Tax Q1", "FL", "Sales tax", "2026-04-30", "2026-04-20", "2026-04-18", "done", "low"),
      task("demo-firm-triage", "demo-triage-task-alameda-1041-prior-done", "demo-triage-client-alameda", "demo-triage-profile-alameda-1041", "rule-irs-1041-filing", "Form 1041 prior filing", "federal", "Income tax", "2026-04-30", "2026-04-15", "2026-04-21", "done", "low"),
      ...triageDueThisWeekLoadTestTasks(),
      task("demo-firm-coverage", "demo-coverage-task-tx-franchise", "demo-coverage-client-northstar", "demo-coverage-profile-northstar-tx", "rule-tx-franchise-filing", "TX Franchise Tax Filing", "TX", "Franchise tax", "2026-05-15", "2026-05-15", "2026-05-08", "ready_to_work", "high"),
      enteredTask("demo-firm-coverage", "demo-coverage-task-orchid-entered", "demo-coverage-client-orchid", "demo-coverage-profile-orchid-trust", "Trust state estimate payment", "OR", "Income tax", "2026-06-17", "2026-06-10", "Reference: prior-year workpaper and CPA judgment for trust estimate cadence."),
      enteredTask("demo-firm-coverage", "demo-coverage-task-lakeview-local", "demo-coverage-client-lakeview", "demo-coverage-profile-lakeview-llc", "City gross receipts filing", "Denver", "Local compliance", "2026-07-31", null, "Reference: client city notice uploaded to the firm workpaper system."),
      task("demo-firm-notices", "demo-notices-task-tx-sales", "demo-notices-client-lonestar", "demo-notices-profile-lonestar-sales", "rule-tx-sales-quarterly", "TX Sales and Use Tax Q2", "TX", "Sales tax", "2026-07-20", "2026-07-20", "2026-07-10", "not_started", "high"),
      task("demo-firm-notices", "demo-notices-task-irs-relief", "demo-notices-client-gulf", "demo-notices-profile-gulf-1120", "rule-irs-1120-filing", "Form 1120 Filing", "federal", "Income tax", "2026-10-15", "2026-04-15", "2026-10-01", "in_progress", "urgent"),
    ].map(remapFirm(identities)) satisfies Array<typeof deadlineTasks.$inferInsert>,
    duplicateCandidates: [
      {
        id: "demo-coverage-duplicate-northstar",
        firmId: identity(DEMO_ACCOUNTS[1]).firmId,
        batchId: "demo-coverage-import-karbon",
        incomingReviewItemId: "demo-coverage-review-northstar-duplicate",
        existingClientRelationshipId: "demo-coverage-client-northstar",
        matchedFields: ["clientName", "ein"],
        differingFields: {
          state: { incoming: "TX", existing: "TX, CO" },
        },
        suggestedAction: "update_existing",
        resolution: "pending",
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies Array<typeof duplicateCandidates.$inferInsert>,
    filingProfiles: [
      profile("demo-firm-triage", "demo-triage-profile-rivera-1040", "demo-triage-client-rivera", "Rivera 1040 profile", "individual", ["CA"], "ready", "taxdome", { ssnLast4: "2198" }),
      profile("demo-firm-triage", "demo-triage-profile-hawthorne-1120s", "demo-triage-client-hawthorne", "Hawthorne S corp profile", "s_corp", ["CA"], "ready", "taxdome", { ein: "84-1932048" }),
      profile("demo-firm-triage", "demo-triage-profile-summit-1065", "demo-triage-client-summit", "Summit partnership profile", "partnership", ["CA"], "ready", "taxdome", { ein: "47-2209134" }),
      profile("demo-firm-triage", "demo-triage-profile-chen-ct3", "demo-triage-client-chen", "Chen NY C corp profile", "c_corp", ["NY"], "needs_review", "taxdome", { ein: "13-5874201" }),
      profile("demo-firm-triage", "demo-triage-profile-barton-sales", "demo-triage-client-barton", "Barton TX sales profile", "llc", ["TX"], "ready", "karbon", { ein: "76-3390182" }),
      profile("demo-firm-triage", "demo-triage-profile-barton-fl-sales", "demo-triage-client-barton", "Barton FL sales profile", "llc", ["FL"], "coverage_gap", "karbon", { ein: "76-3390182" }),
      profile("demo-firm-triage", "demo-triage-profile-alameda-1041", "demo-triage-client-alameda", "Alameda trust profile", "trust_estate", ["CA"], "needs_review", "manual", { ein: "91-7046620" }),
      profile("demo-firm-triage", "demo-triage-profile-oakpine-1120", "demo-triage-client-oakpine", "Oak & Pine C corp profile", "c_corp", ["FL"], "ready", "manual", { ein: "59-8842071" }),
      profile("demo-firm-coverage", "demo-coverage-profile-lakeview-llc", "demo-coverage-client-lakeview", "Lakeview LLC multistate", "llc", ["CO", "CA"], "coverage_gap", "karbon"),
      profile("demo-firm-coverage", "demo-coverage-profile-orchid-trust", "demo-coverage-client-orchid", "Orchid trust profile", "trust_estate", ["OR"], "needs_review", "manual"),
      profile("demo-firm-coverage", "demo-coverage-profile-northstar-tx", "demo-coverage-client-northstar", "Northstar TX retail", "c_corp", ["TX"], "unsupported", "karbon"),
      profile("demo-firm-notices", "demo-notices-profile-gulf-1120", "demo-notices-client-gulf", "Gulf Coast C corp", "c_corp", ["FL"], "ready", "manual"),
      profile("demo-firm-notices", "demo-notices-profile-lonestar-sales", "demo-notices-client-lonestar", "Lone Star sales tax", "llc", ["TX"], "ready", "manual"),
    ].map(remapFirm(identities)) satisfies Array<typeof filingProfiles.$inferInsert>,
    firms: firmRows,
    importBatches: [
      {
        id: "demo-coverage-import-karbon",
        firmId: identity(DEMO_ACCOUNTS[1]).firmId,
        sourceSystem: "karbon",
        status: "previewed",
        adapterProfile: "Karbon client export",
        adapterVersion: "karbon-v1",
        totalRows: 8,
        acceptedRows: 5,
        reviewRows: 2,
        duplicateRows: 1,
        headerDetected: true,
        mappingConfidence: 86,
        columnMapping: [
          { sourceColumn: "Client Name", canonicalField: "clientName", confidence: "high" },
          { sourceColumn: "Entity", canonicalField: "entityType", confidence: "medium" },
        ],
        recognizedFields: ["clientName", "entityType", "state"],
        unmappedColumns: ["Owner"],
        validationMessages: ["One duplicate candidate needs CPA review."],
        createdAt: now,
        committedAt: null,
      },
    ] satisfies Array<typeof importBatches.$inferInsert>,
    importReviewItems: [
      {
        id: "demo-coverage-review-northstar-duplicate",
        firmId: identity(DEMO_ACCOUNTS[1]).firmId,
        batchId: "demo-coverage-import-karbon",
        sourceRowId: "row-7",
        rowIndex: 7,
        status: "needs_review",
        problemTypes: ["duplicate_candidate", "coverage_gap"],
        canonicalProfile: {
          clientName: "Northstar Retail",
          ein: "12-3456789",
          ssnLast4: null,
          state: "TX",
          states: ["TX"],
          entityType: "c_corp",
          county: null,
          fiscalYearType: "calendar_year",
          sourceSystem: "karbon",
          sourceClientId: "northstar-retail",
          sourceRowId: "row-7",
          filingProfileName: "Northstar Retail",
        },
        sourceFields: { "Client Name": "Northstar Retail", Entity: "Corporation", State: "TX" },
        messages: ["Possible duplicate of existing Northstar Retail relationship."],
        createdAt: now,
      },
    ] satisfies Array<typeof importReviewItems.$inferInsert>,
    officialNotices: [
      {
        id: "demo-notice-irs-disaster-relief",
        sourceId: "demo-source-irs-disaster-relief",
        sourceSnapshotId: "demo-snapshot-irs-disaster-relief",
        noticeUrl: "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations",
        noticeTitle: "IRS disaster relief postpones affected filing deadlines",
        noticePublishedAt: new Date("2026-04-20T00:00:00.000Z"),
        noticeSummary: "Affected taxpayers receive postponed filing and payment deadlines.",
        jurisdiction: "federal",
        deadlineRelevance: "high",
        confidenceLabel: "high",
        confidenceReasons: ["P0 source", "Deadline date text detected", "Workspace profile match"],
        impactConditions: [
          {
            jurisdiction: "federal",
            taxCategories: ["Income tax"],
            entityTypes: ["c_corp"],
            deadlineKinds: ["filing"],
            dateText: "October 15, 2026",
            affectedLocation: "Gulf Coast counties",
            summary: "Potential official relief change for affected C corporation filings.",
          },
        ],
        workspaceMatchHints: {
          jurisdictions: ["federal"],
          entityTypes: ["c_corp"],
          taxCategories: ["Income tax"],
        },
        alertVisibility: "workspace_alert",
        detectedAt: new Date("2026-04-21T00:00:00.000Z"),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-notice-tx-sales-source-change",
        sourceId: "demo-source-tx-sales",
        sourceSnapshotId: "demo-snapshot-tx-sales",
        noticeUrl: "https://comptroller.texas.gov/taxes/sales/",
        noticeTitle: "Texas sales tax filing page content changed",
        noticePublishedAt: new Date("2026-04-15T00:00:00.000Z"),
        noticeSummary: "Source monitor detected a changed official sales tax filing page.",
        jurisdiction: "TX",
        deadlineRelevance: "medium",
        confidenceLabel: "medium",
        confidenceReasons: ["Known source changed", "Local TX sales tax profile match"],
        impactConditions: [
          {
            jurisdiction: "TX",
            taxCategories: ["Sales tax"],
            entityTypes: ["llc", "c_corp"],
            deadlineKinds: ["filing", "payment"],
            dateText: null,
            affectedLocation: "Texas",
            summary: "Review required before publishing an updated verified rule.",
          },
        ],
        workspaceMatchHints: {
          jurisdictions: ["TX"],
          entityTypes: ["llc", "c_corp"],
          taxCategories: ["Sales tax"],
        },
        alertVisibility: "workspace_alert",
        detectedAt: new Date("2026-04-15T12:00:00.000Z"),
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies Array<typeof officialNotices.$inferInsert>,
    noticeImpactProposals: [
      {
        id: "demo-triage-proposal-tx-sales-review",
        officialNoticeId: "demo-notice-tx-sales-source-change",
        firmId: identity(DEMO_ACCOUNTS[0]).firmId,
        filingProfileId: "demo-triage-profile-barton-sales",
        deadlineTaskId: null,
        proposalType: "coverage_review_status_update",
        beforeState: {
          coverageState: "ready",
        },
        afterState: {
          coverageState: "needs_review",
          reason:
            "Texas sales tax source content changed and should be reviewed for Barton Retail Group before relying on existing coverage.",
        },
        confidenceLabel: "medium",
        confidenceReasons: ["Known P0 source changed", "Barton TX sales tax profile match"],
        status: "pending",
        decidedBy: null,
        decidedAt: null,
        auditLogId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-notices-proposal-irs-relief-task",
        officialNoticeId: "demo-notice-irs-disaster-relief",
        firmId: identity(DEMO_ACCOUNTS[2]).firmId,
        filingProfileId: "demo-notices-profile-gulf-1120",
        deadlineTaskId: "demo-notices-task-irs-relief",
        proposalType: "task_update",
        beforeState: {
          currentDueDate: "2026-04-15",
          originalDueDate: "2026-04-15",
          status: "in_progress",
        },
        afterState: {
          currentDueDate: "2026-10-15",
          originalDueDate: "2026-04-15",
          status: "in_progress",
          reason: "IRS disaster relief notice postpones affected filing deadlines.",
        },
        confidenceLabel: "high",
        confidenceReasons: ["P0 IRS source", "Deadline date text detected", "Gulf Coast profile match"],
        status: "pending",
        decidedBy: null,
        decidedAt: null,
        auditLogId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-notices-proposal-tx-sales-review",
        officialNoticeId: "demo-notice-tx-sales-source-change",
        firmId: identity(DEMO_ACCOUNTS[2]).firmId,
        filingProfileId: "demo-notices-profile-lonestar-sales",
        deadlineTaskId: null,
        proposalType: "coverage_review_status_update",
        beforeState: {
          coverageState: "ready",
        },
        afterState: {
          coverageState: "needs_review",
          reason: "Texas sales tax source content changed and should be reviewed before relying on existing coverage.",
        },
        confidenceLabel: "medium",
        confidenceReasons: ["Known P0 source changed", "Local TX sales tax profile match"],
        status: "pending",
        decidedBy: null,
        decidedAt: null,
        auditLogId: null,
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies Array<typeof noticeImpactProposals.$inferInsert>,
    officialSources: [
      {
        id: "demo-source-irs-disaster-relief",
        jurisdiction: "federal",
        agencyName: "IRS",
        sourceType: "html",
        sourceUrl: "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations",
        allowlistLevel: "p0",
        deadlineScope: "Federal disaster relief deadline notices",
        monitorFrequencyHours: 24,
        active: true,
        lastCheckedAt: new Date("2026-04-21T00:00:00.000Z"),
        lastChangedAt: new Date("2026-04-20T00:00:00.000Z"),
        lastStatus: "success",
        lastErrorMessage: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-source-tx-sales",
        jurisdiction: "TX",
        agencyName: "Texas Comptroller of Public Accounts",
        sourceType: "html",
        sourceUrl: "https://comptroller.texas.gov/taxes/sales/",
        allowlistLevel: "p0",
        deadlineScope: "Texas sales and use tax filing deadlines",
        monitorFrequencyHours: 24,
        active: true,
        lastCheckedAt: new Date("2026-04-15T12:00:00.000Z"),
        lastChangedAt: new Date("2026-04-15T12:00:00.000Z"),
        lastStatus: "success",
        lastErrorMessage: null,
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies Array<typeof officialSources.$inferInsert>,
    relationshipSuggestions: [
      {
        id: "demo-coverage-relationship-orchid",
        firmId: identity(DEMO_ACCOUNTS[1]).firmId,
        batchId: "demo-coverage-import-karbon",
        incomingReviewItemId: "demo-coverage-review-northstar-duplicate",
        suggestedClientRelationshipId: "demo-coverage-client-northstar",
        reason: "Incoming row has matching EIN and similar display name.",
        suggestedAction: "confirm_relationship",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies Array<typeof relationshipSuggestions.$inferInsert>,
    sourceCheckRuns: [
      {
        id: "demo-source-run-irs-disaster-relief",
        sourceId: "demo-source-irs-disaster-relief",
        checkedAt: new Date("2026-04-21T00:00:00.000Z"),
        status: "success",
        httpStatus: 200,
        contentHash: "demo-irs-relief-hash-20260421",
        previousContentHash: "demo-irs-relief-hash-20260401",
        changedDetected: true,
        errorMessage: null,
      },
      {
        id: "demo-source-run-tx-sales",
        sourceId: "demo-source-tx-sales",
        checkedAt: new Date("2026-04-15T12:00:00.000Z"),
        status: "success",
        httpStatus: 200,
        contentHash: "demo-tx-sales-hash-20260415",
        previousContentHash: "demo-tx-sales-hash-20260401",
        changedDetected: true,
        errorMessage: null,
      },
    ] satisfies Array<typeof sourceCheckRuns.$inferInsert>,
    sourceSnapshots: [
      {
        id: "demo-snapshot-irs-disaster-relief",
        sourceId: "demo-source-irs-disaster-relief",
        contentHash: "demo-irs-relief-hash-20260421",
        snapshotUrl: null,
        capturedAt: new Date("2026-04-21T00:00:00.000Z"),
      },
      {
        id: "demo-snapshot-tx-sales",
        sourceId: "demo-source-tx-sales",
        contentHash: "demo-tx-sales-hash-20260415",
        snapshotUrl: null,
        capturedAt: new Date("2026-04-15T12:00:00.000Z"),
      },
    ] satisfies Array<typeof sourceSnapshots.$inferInsert>,
    taxObligations: getSeedObligations(),
    taxRules: getSeedRules(),
    users,
    verificationRequests: [
      {
        id: "demo-coverage-request-manual-orchid",
        firmId: identity(DEMO_ACCOUNTS[1]).firmId,
        requestType: "manual_deadline",
        obligationId: null,
        taxRuleId: null,
        deadlineTaskId: "demo-coverage-task-orchid-entered",
        status: "open",
        message: "Please verify the entered trust estimate deadline reference.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "demo-coverage-request-gap-local",
        firmId: identity(DEMO_ACCOUNTS[1]).firmId,
        requestType: "user_requested",
        obligationId: "obl-tx-sales",
        taxRuleId: "rule-tx-sales-quarterly",
        deadlineTaskId: null,
        status: "open",
        message: "CPA requested expanded coverage for sales tax profile review.",
        createdAt: now,
        updatedAt: now,
      },
    ] satisfies Array<typeof verificationRequests.$inferInsert>,
  };
}

export async function seedDemoData(dbBinding: D1DatabaseBinding) {
  const schemaCompatibility = await ensureDemoSeedSchemaCompatibility(dbBinding);

  const db = createDb(dbBinding);
  const now = new Date();
  const identities: IdentityOverride = {};

  for (const demoAccount of DEMO_ACCOUNTS) {
    const accountCreatedAt = demoAccountCreatedAt(demoAccount, now);
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, demoAccount.email))
      .limit(1);
    const userId = existingUser?.id ?? demoAccount.userId;

    identities[demoAccount.slug] = {
      userId,
      firmId: demoAccount.firmId,
    };

    if (existingUser) {
      await db
        .update(user)
        .set({
          name: demoAccount.name,
          emailVerified: true,
          image: DEMO_ACCOUNT_AVATAR_URL,
          firmName: demoAccount.firmName,
          ...(demoAccount.slug === "triage" ? { createdAt: accountCreatedAt } : {}),
          updatedAt: now,
        })
        .where(eq(user.id, userId));
    } else {
      await db.insert(user).values({
        id: userId,
        name: demoAccount.name,
        email: demoAccount.email,
        emailVerified: true,
        image: DEMO_ACCOUNT_AVATAR_URL,
        firmName: demoAccount.firmName,
        createdAt: accountCreatedAt,
        updatedAt: now,
      });
    }

    const [existingFirm] = await db
      .select({ id: firms.id })
      .from(firms)
      .where(eq(firms.ownerUserId, userId))
      .limit(1);

    if (existingFirm) {
      identities[demoAccount.slug] = {
        userId,
        firmId: existingFirm.id,
      };
      await db
        .update(firms)
        .set({
          name: demoAccount.firmName,
          ...(demoAccount.slug === "triage" ? { createdAt: accountCreatedAt } : {}),
          updatedAt: now,
        })
        .where(eq(firms.id, existingFirm.id));
    } else {
      await db.insert(firms).values({
        id: demoAccount.firmId,
        name: demoAccount.firmName,
        ownerUserId: userId,
        createdAt: accountCreatedAt,
        updatedAt: now,
      });
    }

    await db
      .delete(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const plan = adaptDemoSeedPlanForDeadlineTaskStatusCompatibility(
    buildDemoSeedPlan({ identities, now, passwordHash }),
    { readyToWorkSupported: schemaCompatibility.readyToWorkSupported },
  );

  for (const firm of plan.firms) {
    await resetFirmWorkspace(db, firm.id);
  }

  await upsertTaxSeed(db, plan);
  await insertIfAny(db, account, plan.accounts);
  await upsertOfficialNoticeSeed(db, plan);
  await insertIfAny(db, clientRelationships, plan.clientRelationships);
  await insertIfAny(db, filingProfiles, plan.filingProfiles);
  await insertIfAny(db, deadlineTasks, plan.deadlineTasks);
  await insertIfAny(db, noticeImpactProposals, plan.noticeImpactProposals, { optional: true });
  await insertIfAny(db, auditLogs, plan.auditLogs);
  await insertIfAny(db, deadlineDateEvents, plan.deadlineDateEvents);
  await insertIfAny(db, deadlineTaskUpdateRecords, plan.deadlineTaskUpdateRecords, { optional: true });
  await insertIfAny(db, verificationRequests, plan.verificationRequests, { optional: true });
  await insertIfAny(db, importBatches, plan.importBatches, { optional: true });
  await insertIfAny(db, importReviewItems, plan.importReviewItems, { optional: true });
  await insertIfAny(db, relationshipSuggestions, plan.relationshipSuggestions, { optional: true });
  await insertIfAny(db, duplicateCandidates, plan.duplicateCandidates, { optional: true });

  return {
    accounts: DEMO_ACCOUNTS.map((demoAccount) => ({
      email: demoAccount.email,
      firmId: identities[demoAccount.slug]?.firmId ?? demoAccount.firmId,
      firmName: demoAccount.firmName,
      intent: demoAccount.intent,
    })),
    password: DEMO_PASSWORD,
  };
}

async function ensureDemoSeedSchemaCompatibility(dbBinding: D1DatabaseBinding) {
  const deadlineTasksTable = await dbBinding
    .prepare("select sql from sqlite_master where type = 'table' and name = 'deadline_tasks'")
    .first<{ sql: string | null }>();

  if (deadlineTasksTable?.sql) {
    for (const statement of DEADLINE_TASKS_INDEX_COMPATIBILITY_STATEMENTS) {
      await dbBinding.prepare(statement).run();
    }
  }

  return {
    readyToWorkSupported: !needsReadyToWorkStatusCompatibilityPatch(deadlineTasksTable?.sql),
  };
}

function client(
  firmId: string,
  id: string,
  displayName: string,
  relationshipType: (typeof clientRelationships.$inferInsert)["relationshipType"],
  notes: string,
) {
  return {
    id,
    firmId,
    displayName,
    relationshipType,
    notes,
    sourceSystem: "manual",
    createdVia: "manual",
    createdAt: DEMO_SEEDED_AT,
    updatedAt: DEMO_SEEDED_AT,
  } satisfies typeof clientRelationships.$inferInsert;
}

function profile(
  firmId: string,
  id: string,
  clientRelationshipId: string,
  displayName: string,
  entityType: (typeof filingProfiles.$inferInsert)["entityType"],
  states: string[],
  coverageState: (typeof filingProfiles.$inferInsert)["coverageState"],
  sourceSystem: (typeof filingProfiles.$inferInsert)["sourceSystem"],
  options: {
    ein?: string | null;
    ssnLast4?: string | null;
  } = {},
) {
  return {
    id,
    firmId,
    clientRelationshipId,
    displayName,
    ein: options.ein ?? null,
    ssnLast4: options.ssnLast4 ?? null,
    entityType,
    states,
    county: null,
    fiscalYearType: "calendar_year",
    coverageState,
    notes: null,
    sourceSystem,
    sourceRowId: null,
    createdVia: sourceSystem === "manual" ? "manual" : "csv_import",
    createdAt: DEMO_SEEDED_AT,
    updatedAt: DEMO_SEEDED_AT,
  } satisfies typeof filingProfiles.$inferInsert;
}

function task(
  firmId: string,
  id: string,
  clientRelationshipId: string,
  filingProfileId: string,
  taxRuleId: string,
  title: string,
  jurisdiction: string,
  taxCategory: string,
  currentDueDate: string,
  originalDueDate: string,
  firmTargetDate: string | null,
  status: (typeof deadlineTasks.$inferInsert)["status"],
  priority: (typeof deadlineTasks.$inferInsert)["priority"],
) {
  return {
    id,
    firmId,
    clientRelationshipId,
    filingProfileId,
    taxRuleId,
    title,
    jurisdiction,
    taxCategory,
    currentDueDate,
    originalDueDate,
    firmTargetDate,
    recurrenceKey: "annual",
    status,
    priority,
    sourceType: "verified_rule",
    createdVia: "system_rule",
    enteredDeadlineReferenceNote: null,
    createdAt: DEMO_SEEDED_AT,
    updatedAt: DEMO_SEEDED_AT,
  } satisfies typeof deadlineTasks.$inferInsert;
}

function enteredTask(
  firmId: string,
  id: string,
  clientRelationshipId: string,
  filingProfileId: string,
  title: string,
  jurisdiction: string,
  taxCategory: string,
  currentDueDate: string,
  firmTargetDate: string | null,
  enteredDeadlineReferenceNote: string,
) {
  return {
    id,
    firmId,
    clientRelationshipId,
    filingProfileId,
    taxRuleId: null,
    title,
    jurisdiction,
    taxCategory,
    currentDueDate,
    originalDueDate: null,
    firmTargetDate,
    recurrenceKey: null,
    status: "not_started",
    priority: "normal",
    sourceType: "entered_deadline",
    createdVia: "manual",
    enteredDeadlineReferenceNote,
    createdAt: DEMO_SEEDED_AT,
    updatedAt: DEMO_SEEDED_AT,
  } satisfies typeof deadlineTasks.$inferInsert;
}

function triageDueThisWeekLoadTestTasks() {
  const templates = [
    {
      clientRelationshipId: "demo-triage-client-rivera",
      filingProfileId: "demo-triage-profile-rivera-1040",
      jurisdiction: "federal",
      taxCategory: "Estimated tax",
      taxRuleId: "rule-irs-1040es-quarterly",
      title: "Form 1040-ES review",
    },
    {
      clientRelationshipId: "demo-triage-client-hawthorne",
      filingProfileId: "demo-triage-profile-hawthorne-1120s",
      jurisdiction: "CA",
      taxCategory: "Estimated tax",
      taxRuleId: "rule-ca-100es-quarterly",
      title: "CA Form 100-ES review",
    },
    {
      clientRelationshipId: "demo-triage-client-barton",
      filingProfileId: "demo-triage-profile-barton-sales",
      jurisdiction: "TX",
      taxCategory: "Sales tax",
      taxRuleId: "rule-tx-sales-quarterly",
      title: "TX Sales and Use Tax review",
    },
    {
      clientRelationshipId: "demo-triage-client-summit",
      filingProfileId: "demo-triage-profile-summit-1065",
      jurisdiction: "CA",
      taxCategory: "Franchise tax",
      taxRuleId: "rule-ca-565-filing",
      title: "CA Form 565 review",
    },
  ] as const;
  const statuses = ["not_started", "waiting_on_client", "ready_to_work", "in_progress"] as const;
  const priorities = ["normal", "high", "urgent", "low"] as const;
  const dates = [
    "2026-05-05",
    "2026-05-06",
    "2026-05-07",
    "2026-05-08",
    "2026-05-09",
    "2026-05-10",
    "2026-05-11",
  ] as const;
  const generatedCount =
    DEMO_TRIAGE_DUE_THIS_WEEK_TARGET - DEMO_TRIAGE_BASE_DUE_THIS_WEEK_TASK_COUNT;

  return Array.from({ length: generatedCount }, (_, index) => {
    const template = templates[index % templates.length]!;
    const dueDateIndex = index % dates.length;
    const dueDate = dates[dueDateIndex]!;
    const firmTargetDate = dates[Math.max(0, dueDateIndex - 2)]!;
    const sequence = String(index + 1).padStart(3, "0");

    return task(
      "demo-firm-triage",
      `demo-triage-load-due-week-${sequence}`,
      template.clientRelationshipId,
      template.filingProfileId,
      template.taxRuleId,
      `${template.title} ${sequence}`,
      template.jurisdiction,
      template.taxCategory,
      dueDate,
      dueDate,
      firmTargetDate,
      statuses[index % statuses.length]!,
      priorities[index % priorities.length]!,
    );
  });
}

function auditLog(
  firmId: string,
  id: string,
  overrides: Pick<
    typeof auditLogs.$inferInsert,
    "action" | "afterState" | "entityId" | "metadata" | "sourceId" | "sourceType"
  >,
) {
  return {
    id,
    firmId,
    actorType: "system",
    actorUserId: null,
    action: overrides.action,
    entityType: "deadline_task",
    entityId: overrides.entityId,
    beforeState: null,
    afterState: overrides.afterState,
    sourceType: overrides.sourceType,
    sourceId: overrides.sourceId,
    metadata: overrides.metadata,
    createdAt: DEMO_SEEDED_AT,
  } satisfies typeof auditLogs.$inferInsert;
}

function dateEvent(
  firmId: string,
  id: string,
  overrides: Pick<
    typeof deadlineDateEvents.$inferInsert,
    | "auditLogId"
    | "deadlineTaskId"
    | "eventType"
    | "newCurrentDueDate"
    | "notes"
    | "previousCurrentDueDate"
    | "sourceName"
    | "sourceUrl"
  >,
) {
  return {
    id,
    firmId,
    deadlineTaskId: overrides.deadlineTaskId,
    eventType: overrides.eventType,
    previousCurrentDueDate: overrides.previousCurrentDueDate,
    newCurrentDueDate: overrides.newCurrentDueDate,
    previousFirmTargetDate: null,
    newFirmTargetDate: null,
    sourceName: overrides.sourceName,
    sourceUrl: overrides.sourceUrl,
    sourceSnapshotId: null,
    createdBy: null,
    auditLogId: overrides.auditLogId,
    createdAt: DEMO_SEEDED_AT,
    notes: overrides.notes,
  } satisfies typeof deadlineDateEvents.$inferInsert;
}

function taskUpdateRecord(
  firmId: string,
  id: string,
  overrides: Pick<
    typeof deadlineTaskUpdateRecords.$inferInsert,
    | "action"
    | "createdAt"
    | "deadlineTaskId"
    | "fieldName"
    | "newValue"
    | "previousValue"
  >,
) {
  return {
    id,
    firmId,
    deadlineTaskId: overrides.deadlineTaskId,
    fieldName: overrides.fieldName,
    previousValue: overrides.previousValue,
    newValue: overrides.newValue,
    action: overrides.action,
    auditLogId: null,
    actorUserId: null,
    createdAt: overrides.createdAt,
  } satisfies typeof deadlineTaskUpdateRecords.$inferInsert;
}

function remapFirm(identities: IdentityOverride) {
  const firmMap = new Map<string, string>(
    DEMO_ACCOUNTS.map((account) => [
      account.firmId,
      identities[account.slug]?.firmId ?? account.firmId,
    ]),
  );

  return <T extends { firmId: string }>(row: T): T => ({
    ...row,
    firmId: firmMap.get(row.firmId) ?? row.firmId,
  });
}

async function resetFirmWorkspace(db: ReturnType<typeof createDb>, firmId: string) {
  await ignoreMissingTable(
    db.delete(noticeProposalActions).where(eq(noticeProposalActions.firmId, firmId)),
  );
  await ignoreMissingTable(
    db.delete(noticeImpactProposals).where(eq(noticeImpactProposals.firmId, firmId)),
  );
  await ignoreMissingTable(
    db.delete(relationshipSuggestions).where(eq(relationshipSuggestions.firmId, firmId)),
  );
  await ignoreMissingTable(
    db.delete(duplicateCandidates).where(eq(duplicateCandidates.firmId, firmId)),
  );
  await ignoreMissingTable(db.delete(importReviewItems).where(eq(importReviewItems.firmId, firmId)));
  await ignoreMissingTable(db.delete(importBatches).where(eq(importBatches.firmId, firmId)));
  await ignoreMissingTable(
    db.delete(verificationRequests).where(eq(verificationRequests.firmId, firmId)),
  );
  await ignoreMissingTable(
    db.delete(deadlineTaskUpdateRecords).where(eq(deadlineTaskUpdateRecords.firmId, firmId)),
  );
  await db.delete(deadlineDateEvents).where(eq(deadlineDateEvents.firmId, firmId));
  await db.delete(deadlineTasks).where(eq(deadlineTasks.firmId, firmId));
  await db.delete(filingProfiles).where(eq(filingProfiles.firmId, firmId));
  await db.delete(clientRelationships).where(eq(clientRelationships.firmId, firmId));
  await db.delete(auditLogs).where(eq(auditLogs.firmId, firmId));
}

async function upsertTaxSeed(db: ReturnType<typeof createDb>, plan: DemoSeedPlan) {
  for (const obligation of plan.taxObligations) {
    await db
      .insert(taxObligations)
      .values(obligation)
      .onConflictDoUpdate({
        target: taxObligations.id,
        set: obligation,
      });
  }

  for (const rule of plan.taxRules) {
    await db
      .insert(taxRules)
      .values(rule)
      .onConflictDoUpdate({
        target: taxRules.id,
        set: rule,
      });
  }
}

async function upsertOfficialNoticeSeed(db: ReturnType<typeof createDb>, plan: DemoSeedPlan) {
  await ignoreMissingTable(Promise.all(
    plan.officialSources.map((source) =>
      db
        .insert(officialSources)
        .values(source)
        .onConflictDoUpdate({ target: officialSources.id, set: source }),
    ),
  ));
  await ignoreMissingTable(Promise.all(
    plan.sourceSnapshots.map((snapshot) =>
      db
        .insert(sourceSnapshots)
        .values(snapshot)
        .onConflictDoUpdate({ target: sourceSnapshots.id, set: snapshot }),
    ),
  ));
  await ignoreMissingTable(Promise.all(
    plan.sourceCheckRuns.map((run) =>
      db
        .insert(sourceCheckRuns)
        .values(run)
        .onConflictDoUpdate({ target: sourceCheckRuns.id, set: run }),
    ),
  ));
  await ignoreMissingTable(Promise.all(
    plan.officialNotices.map((notice) =>
      db
        .insert(officialNotices)
        .values(notice)
        .onConflictDoUpdate({ target: officialNotices.id, set: notice }),
    ),
  ));
}

async function insertIfAny<TTable extends Parameters<ReturnType<typeof createDb>["insert"]>[0]>(
  db: ReturnType<typeof createDb>,
  table: TTable,
  rows: Array<TTable["$inferInsert"]>,
  options: { optional?: boolean } = {},
) {
  if (rows.length === 0) return;

  for (const row of rows) {
    const insert = db.insert(table).values(row);

    if (options.optional) {
      await ignoreMissingTable(insert);
      continue;
    }

    await insert;
  }
}

async function ignoreMissingTable<T>(operation: Promise<T>) {
  try {
    return await operation;
  } catch (error) {
    if (isMissingTableError(error)) {
      return undefined;
    }

    throw error;
  }
}

function isMissingTableError(error: unknown) {
  let current: unknown = error;

  while (current && typeof current === "object") {
    if ("message" in current && String(current.message).includes("no such table")) {
      return true;
    }
    current = "cause" in current ? current.cause : null;
  }

  return false;
}
