import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { createDb, type D1DatabaseBinding } from "@due-date-hq/db";
import { auditLogs } from "@due-date-hq/db/schema/audit";
import { account, user } from "@due-date-hq/db/schema/auth";
import {
  clientRelationships,
  deadlineDateEvents,
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
  taxObligations,
  taxRules,
  verificationRequests,
} from "@due-date-hq/db/schema/tax-rules";

import { getSeedObligations, getSeedRules } from "./seed-tax-data";

export const DEMO_PASSWORD = "DueDateHQ-demo-2026!";

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

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];
type DemoSlug = DemoAccount["slug"];
type IdentityOverride = Partial<Record<DemoSlug, { userId: string; firmId: string }>>;

export type DemoSeedPlan = ReturnType<typeof buildDemoSeedPlan>;

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
    image: null,
    firmName: account.firmName,
    createdAt: now,
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
    createdAt: now,
    updatedAt: now,
  })) satisfies Array<typeof account.$inferInsert>;
  const firmRows = DEMO_ACCOUNTS.map((account) => ({
    id: identity(account).firmId,
    name: account.firmName,
    ownerUserId: identity(account).userId,
    createdAt: now,
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
    deadlineTasks: [
      task("demo-firm-triage", "demo-triage-task-1040", "demo-triage-client-rivera", "demo-triage-profile-rivera-1040", "rule-irs-1040-filing", "Form 1040 Filing", "federal", "Income tax", "2026-05-01", "2026-04-15", "2026-04-25", "waiting_on_client", "urgent"),
      task("demo-firm-triage", "demo-triage-task-540", "demo-triage-client-rivera", "demo-triage-profile-rivera-1040", "rule-ca-540-filing", "CA Form 540 Filing", "CA", "Income tax", "2026-05-05", "2026-04-15", "2026-05-01", "in_progress", "high"),
      task("demo-firm-triage", "demo-triage-task-1120s", "demo-triage-client-hawthorne", "demo-triage-profile-hawthorne-1120s", "rule-irs-1120s-filing", "Form 1120-S Filing", "federal", "Income tax", "2026-09-15", "2026-03-16", "2026-09-01", "not_started", "normal"),
      task("demo-firm-triage", "demo-triage-task-100s", "demo-triage-client-hawthorne", "demo-triage-profile-hawthorne-1120s", "rule-ca-100s-filing", "CA Form 100S Filing", "CA", "Franchise tax", "2026-05-20", "2026-03-16", "2026-05-13", "not_started", "normal"),
      task("demo-firm-triage", "demo-triage-task-1065", "demo-triage-client-summit", "demo-triage-profile-summit-1065", "rule-irs-1065-filing", "Form 1065 Filing", "federal", "Income tax", "2026-10-15", "2026-03-16", "2026-10-01", "done", "low"),
      task("demo-firm-coverage", "demo-coverage-task-tx-franchise", "demo-coverage-client-northstar", "demo-coverage-profile-northstar-tx", "rule-tx-franchise-filing", "TX Franchise Tax Filing", "TX", "Franchise tax", "2026-05-15", "2026-05-15", "2026-05-08", "not_started", "high"),
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
      profile("demo-firm-triage", "demo-triage-profile-rivera-1040", "demo-triage-client-rivera", "Rivera 1040 profile", "individual", ["CA"], "ready", "taxdome"),
      profile("demo-firm-triage", "demo-triage-profile-hawthorne-1120s", "demo-triage-client-hawthorne", "Hawthorne S corp profile", "s_corp", ["CA"], "ready", "taxdome"),
      profile("demo-firm-triage", "demo-triage-profile-summit-1065", "demo-triage-client-summit", "Summit partnership profile", "partnership", ["CA"], "ready", "taxdome"),
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
          sourceRowId: "row-7",
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
  const db = createDb(dbBinding);
  const now = new Date();
  const identities: IdentityOverride = {};

  for (const demoAccount of DEMO_ACCOUNTS) {
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
          firmName: demoAccount.firmName,
          updatedAt: now,
        })
        .where(eq(user.id, userId));
    } else {
      await db.insert(user).values({
        id: userId,
        name: demoAccount.name,
        email: demoAccount.email,
        emailVerified: true,
        image: null,
        firmName: demoAccount.firmName,
        createdAt: now,
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
        .set({ name: demoAccount.firmName, updatedAt: now })
        .where(eq(firms.id, existingFirm.id));
    } else {
      await db.insert(firms).values({
        id: demoAccount.firmId,
        name: demoAccount.firmName,
        ownerUserId: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db
      .delete(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const plan = buildDemoSeedPlan({ identities, now, passwordHash });

  for (const firm of plan.firms) {
    await resetFirmWorkspace(db, firm.id);
  }

  await upsertTaxSeed(db, plan);
  await insertIfAny(db, account, plan.accounts);
  await upsertOfficialNoticeSeed(db, plan);
  await insertIfAny(db, clientRelationships, plan.clientRelationships);
  await insertIfAny(db, filingProfiles, plan.filingProfiles);
  await insertIfAny(db, deadlineTasks, plan.deadlineTasks);
  await insertIfAny(db, auditLogs, plan.auditLogs);
  await insertIfAny(db, deadlineDateEvents, plan.deadlineDateEvents);
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
) {
  return {
    id,
    firmId,
    clientRelationshipId,
    displayName,
    ein: null,
    ssnLast4: null,
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
