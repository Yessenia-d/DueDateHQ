import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { auditLogs } from "./audit";
import { user } from "./auth";
import { deadlineTasks, filingProfiles } from "./deadline-domain";
import { firms } from "./firms";
import { confidenceLabels, officialNotices } from "./monitoring";

export const noticeProposalTypes = [
  "task_update",
  "coverage_review_status_update",
] as const;
export type NoticeProposalType = (typeof noticeProposalTypes)[number];

export const noticeProposalStatuses = [
  "pending",
  "approved",
  "rejected",
  "decide_later",
] as const;
export type NoticeProposalStatus = (typeof noticeProposalStatuses)[number];

export const noticeProposalActionTypes = [
  "approve",
  "reject",
  "decide_later",
] as const;
export type NoticeProposalActionType = (typeof noticeProposalActionTypes)[number];

export type NoticeProposalState = Record<string, unknown>;

export const noticeImpactProposals = sqliteTable(
  "notice_impact_proposals",
  {
    id: text("id").primaryKey(),
    officialNoticeId: text("official_notice_id")
      .notNull()
      .references(() => officialNotices.id, { onDelete: "cascade" }),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    filingProfileId: text("filing_profile_id").references(() => filingProfiles.id, {
      onDelete: "cascade",
    }),
    deadlineTaskId: text("deadline_task_id").references(() => deadlineTasks.id, {
      onDelete: "cascade",
    }),
    proposalType: text("proposal_type", { enum: noticeProposalTypes }).notNull(),
    beforeState: text("before_state", { mode: "json" }).notNull().$type<NoticeProposalState>(),
    afterState: text("after_state", { mode: "json" }).notNull().$type<NoticeProposalState>(),
    confidenceLabel: text("confidence_label", { enum: confidenceLabels }).notNull(),
    confidenceReasons: text("confidence_reasons", { mode: "json" }).notNull().$type<string[]>(),
    status: text("status", { enum: noticeProposalStatuses }).notNull().default("pending"),
    decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    auditLogId: text("audit_log_id").references(() => auditLogs.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("notice_impact_proposals_notice_status_idx").on(
      table.officialNoticeId,
      table.status,
    ),
    index("notice_impact_proposals_firm_status_idx").on(table.firmId, table.status),
    index("notice_impact_proposals_deadline_task_idx").on(table.deadlineTaskId),
    index("notice_impact_proposals_filing_profile_idx").on(table.filingProfileId),
    uniqueIndex("notice_impact_proposals_firm_id_id_unique").on(table.firmId, table.id),
    foreignKey({
      name: "notice_impact_proposals_firm_filing_profile_fk",
      columns: [table.firmId, table.filingProfileId],
      foreignColumns: [filingProfiles.firmId, filingProfiles.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "notice_impact_proposals_firm_deadline_task_fk",
      columns: [table.firmId, table.deadlineTaskId],
      foreignColumns: [deadlineTasks.firmId, deadlineTasks.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "notice_impact_proposals_firm_audit_log_fk",
      columns: [table.firmId, table.auditLogId],
      foreignColumns: [auditLogs.firmId, auditLogs.id],
    }),
    check(
      "notice_impact_proposals_type_check",
      sql`${table.proposalType} in ('task_update', 'coverage_review_status_update')`,
    ),
    check(
      "notice_impact_proposals_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected', 'decide_later')`,
    ),
    check(
      "notice_impact_proposals_confidence_label_check",
      sql`${table.confidenceLabel} in ('high', 'medium', 'low')`,
    ),
    check(
      "notice_impact_proposals_target_check",
      sql`(${table.proposalType} = 'task_update' and ${table.deadlineTaskId} is not null) or (${table.proposalType} = 'coverage_review_status_update' and ${table.filingProfileId} is not null)`,
    ),
    check(
      "notice_impact_proposals_decision_check",
      sql`(${table.status} = 'pending' and ${table.decidedAt} is null and ${table.decidedBy} is null) or (${table.status} != 'pending' and ${table.decidedAt} is not null and ${table.decidedBy} is not null)`,
    ),
  ],
);

export const noticeProposalActions = sqliteTable(
  "notice_proposal_actions",
  {
    id: text("id").primaryKey(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.id, { onDelete: "cascade" }),
    officialNoticeId: text("official_notice_id")
      .notNull()
      .references(() => officialNotices.id, { onDelete: "cascade" }),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => noticeImpactProposals.id, { onDelete: "cascade" }),
    action: text("action", { enum: noticeProposalActionTypes }).notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    previousStatus: text("previous_status", { enum: noticeProposalStatuses }).notNull(),
    newStatus: text("new_status", { enum: noticeProposalStatuses }).notNull(),
    beforeState: text("before_state", { mode: "json" }).notNull().$type<NoticeProposalState>(),
    afterState: text("after_state", { mode: "json" }).notNull().$type<NoticeProposalState>(),
    auditLogId: text("audit_log_id").references(() => auditLogs.id),
    bulkActionId: text("bulk_action_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("notice_proposal_actions_notice_created_at_idx").on(
      table.officialNoticeId,
      table.createdAt,
    ),
    index("notice_proposal_actions_proposal_created_at_idx").on(table.proposalId, table.createdAt),
    index("notice_proposal_actions_bulk_action_idx").on(table.bulkActionId),
    uniqueIndex("notice_proposal_actions_firm_id_id_unique").on(table.firmId, table.id),
    foreignKey({
      name: "notice_proposal_actions_firm_proposal_fk",
      columns: [table.firmId, table.proposalId],
      foreignColumns: [noticeImpactProposals.firmId, noticeImpactProposals.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "notice_proposal_actions_firm_audit_log_fk",
      columns: [table.firmId, table.auditLogId],
      foreignColumns: [auditLogs.firmId, auditLogs.id],
    }),
    check(
      "notice_proposal_actions_action_check",
      sql`${table.action} in ('approve', 'reject', 'decide_later')`,
    ),
    check(
      "notice_proposal_actions_status_check",
      sql`${table.previousStatus} in ('pending', 'approved', 'rejected', 'decide_later') and ${table.newStatus} in ('pending', 'approved', 'rejected', 'decide_later')`,
    ),
  ],
);

export type NoticeImpactProposal = typeof noticeImpactProposals.$inferSelect;
export type NewNoticeImpactProposal = typeof noticeImpactProposals.$inferInsert;

export type NoticeProposalAction = typeof noticeProposalActions.$inferSelect;
export type NewNoticeProposalAction = typeof noticeProposalActions.$inferInsert;
