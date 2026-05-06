import { and, eq, inArray, or } from "drizzle-orm";
import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTaskStatuses,
  deadlineTaskUpdateRecords,
  deadlineTasks,
  filingProfileCoverageStates,
  filingProfiles,
  type DeadlineTask,
  type FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";
import { officialNotices, officialSources } from "@due-date-hq/db/schema/monitoring";
import {
  noticeImpactProposals,
  noticeProposalActions,
  type NoticeImpactProposal,
  type NoticeProposalActionType,
  type NoticeProposalStatus,
} from "@due-date-hq/db/schema/notice-proposals";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession, type Context } from "../context";
import { publicProcedure, router } from "../index";
import { dateStringSchema } from "./dashboard";

type FirmSession = ReturnType<typeof requireFirmSession>;

export type NoticeProposalResponse = {
  id: string;
  officialNoticeId: string;
  filingProfileId: string | null;
  deadlineTaskId: string | null;
  proposalType: NoticeImpactProposal["proposalType"];
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  confidenceLabel: NoticeImpactProposal["confidenceLabel"];
  confidenceReasons: string[];
  status: NoticeImpactProposal["status"];
  decidedBy: string | null;
  decidedAt: string | null;
  auditLogId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoticeProposalListItem = NoticeProposalResponse & {
  target: {
    clientDisplayName: string | null;
    filingProfileDisplayName: string | null;
    taskTitle: string | null;
    jurisdiction: string | null;
    taxCategory: string | null;
  };
};

type ProposalDecisionResult = {
  action: NoticeProposalActionType;
  bulkActionId: string | null;
  proposal: NoticeProposalResponse;
};

const proposalIdSchema = z.string().trim().min(1);

const taskPatchSchema = z
  .object({
    currentDueDate: dateStringSchema.optional(),
    originalDueDate: dateStringSchema.nullable().optional(),
    firmTargetDate: dateStringSchema.nullable().optional(),
    status: z.enum(deadlineTaskStatuses).optional(),
  })
  .passthrough();

const coveragePatchSchema = z
  .object({
    coverageState: z.enum(filingProfileCoverageStates),
  })
  .passthrough();

export const noticeProposalsRouter = router({
  listForNotice: publicProcedure
    .input(z.object({ noticeId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }): Promise<{ proposals: NoticeProposalListItem[] }> => {
      const session = requireFirmSession(ctx);
      const rows = await ctx.db
        .select({
          proposal: noticeImpactProposals,
          task: deadlineTasks,
          profile: filingProfiles,
          client: clientRelationships,
        })
        .from(noticeImpactProposals)
        .innerJoin(officialNotices, eq(noticeImpactProposals.officialNoticeId, officialNotices.id))
        .leftJoin(
          deadlineTasks,
          and(
            eq(noticeImpactProposals.firmId, deadlineTasks.firmId),
            eq(noticeImpactProposals.deadlineTaskId, deadlineTasks.id),
          ),
        )
        .leftJoin(
          filingProfiles,
          and(
            eq(noticeImpactProposals.firmId, filingProfiles.firmId),
            or(
              eq(noticeImpactProposals.filingProfileId, filingProfiles.id),
              eq(deadlineTasks.filingProfileId, filingProfiles.id),
            ),
          ),
        )
        .leftJoin(
          clientRelationships,
          and(
            eq(filingProfiles.firmId, clientRelationships.firmId),
            or(
              eq(filingProfiles.clientRelationshipId, clientRelationships.id),
              eq(deadlineTasks.clientRelationshipId, clientRelationships.id),
            ),
          ),
        )
        .where(
          and(
            eq(noticeImpactProposals.firmId, session.firm.id),
            eq(noticeImpactProposals.officialNoticeId, input.noticeId),
            eq(officialNotices.alertVisibility, "workspace_alert"),
            inArray(officialNotices.confidenceLabel, ["high", "medium"]),
          ),
        );

      return {
        proposals: rows.map((row) => ({
          ...serializeNoticeProposal(row.proposal),
          target: {
            clientDisplayName: row.client?.displayName ?? null,
            filingProfileDisplayName: row.profile?.displayName ?? null,
            taskTitle: row.task?.title ?? null,
            jurisdiction: row.task?.jurisdiction ?? row.profile?.states[0] ?? null,
            taxCategory: row.task?.taxCategory ?? null,
          },
        })),
      };
    }),

  approve: publicProcedure
    .input(z.object({ proposalId: proposalIdSchema }))
    .mutation(async ({ ctx, input }) => decideProposal(ctx, input.proposalId, "approve")),

  reject: publicProcedure
    .input(z.object({ proposalId: proposalIdSchema }))
    .mutation(async ({ ctx, input }) => decideProposal(ctx, input.proposalId, "reject")),

  decideLater: publicProcedure
    .input(z.object({ proposalId: proposalIdSchema }))
    .mutation(async ({ ctx, input }) => decideProposal(ctx, input.proposalId, "decide_later")),

  bulkApprove: publicProcedure
    .input(z.object({ proposalIds: z.array(proposalIdSchema).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => bulkDecideProposals(ctx, input.proposalIds, "approve")),

  bulkReject: publicProcedure
    .input(z.object({ proposalIds: z.array(proposalIdSchema).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => bulkDecideProposals(ctx, input.proposalIds, "reject")),

  bulkDecideLater: publicProcedure
    .input(z.object({ proposalIds: z.array(proposalIdSchema).min(1).max(100) }))
    .mutation(async ({ ctx, input }) =>
      bulkDecideProposals(ctx, input.proposalIds, "decide_later"),
    ),
});

export function serializeNoticeProposal(proposal: NoticeImpactProposal): NoticeProposalResponse {
  return {
    id: proposal.id,
    officialNoticeId: proposal.officialNoticeId,
    filingProfileId: proposal.filingProfileId,
    deadlineTaskId: proposal.deadlineTaskId,
    proposalType: proposal.proposalType,
    beforeState: proposal.beforeState,
    afterState: proposal.afterState,
    confidenceLabel: proposal.confidenceLabel,
    confidenceReasons: proposal.confidenceReasons,
    status: proposal.status,
    decidedBy: proposal.decidedBy,
    decidedAt: proposal.decidedAt?.toISOString() ?? null,
    auditLogId: proposal.auditLogId,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };
}

async function bulkDecideProposals(
  ctx: Context,
  proposalIds: string[],
  action: NoticeProposalActionType,
) {
  const bulkActionId = crypto.randomUUID();
  const results: ProposalDecisionResult[] = [];

  for (const proposalId of proposalIds) {
    results.push(await decideProposal(ctx, proposalId, action, bulkActionId));
  }

  return {
    action,
    bulkActionId,
    updatedCount: results.length,
    proposals: results.map((result) => result.proposal),
  };
}

async function decideProposal(
  ctx: Context,
  proposalId: string,
  action: NoticeProposalActionType,
  bulkActionId: string | null = null,
): Promise<ProposalDecisionResult> {
  const session = requireFirmSession(ctx);
  const row = await loadProposalDecisionRow(ctx, session, proposalId);
  const newStatus = statusForAction(action);

  if (row.proposal.status === newStatus) {
    return {
      action,
      bulkActionId,
      proposal: serializeNoticeProposal(row.proposal),
    };
  }

  if (row.proposal.status === "approved" || row.proposal.status === "rejected") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This notice proposal has already been finalized.",
    });
  }

  const now = new Date();
  const workspaceAfterState =
    action === "approve"
      ? await applyProposalWorkspacePatch({ ctx, now, row, session })
      : row.proposal.afterState;
  const auditLogId = await recordProposalAudit({
    action,
    bulkActionId,
    ctx,
    row,
    session,
    workspaceAfterState,
    now,
  });

  await ctx.db.insert(noticeProposalActions).values({
    id: crypto.randomUUID(),
    firmId: session.firm.id,
    officialNoticeId: row.proposal.officialNoticeId,
    proposalId: row.proposal.id,
    action,
    actorUserId: session.user.id,
    previousStatus: row.proposal.status,
    newStatus,
    beforeState: row.proposal.beforeState,
    afterState: workspaceAfterState,
    auditLogId,
    bulkActionId,
    createdAt: now,
  });

  const [updatedProposal] = await ctx.db
    .update(noticeImpactProposals)
    .set({
      status: newStatus,
      decidedBy: session.user.id,
      decidedAt: now,
      auditLogId,
      updatedAt: now,
    })
    .where(and(eq(noticeImpactProposals.firmId, session.firm.id), eq(noticeImpactProposals.id, proposalId)))
    .returning();

  if (!updatedProposal) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notice proposal decision could not be recorded.",
    });
  }

  return {
    action,
    bulkActionId,
    proposal: serializeNoticeProposal(updatedProposal),
  };
}

function statusForAction(action: NoticeProposalActionType): NoticeProposalStatus {
  switch (action) {
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "decide_later":
      return "decide_later";
  }
}

type ProposalDecisionRow = Awaited<ReturnType<typeof loadProposalDecisionRow>>;

async function loadProposalDecisionRow(ctx: Context, session: FirmSession, proposalId: string) {
  const [row] = await ctx.db
    .select({
      proposal: noticeImpactProposals,
      notice: officialNotices,
      source: officialSources,
    })
    .from(noticeImpactProposals)
    .innerJoin(officialNotices, eq(noticeImpactProposals.officialNoticeId, officialNotices.id))
    .innerJoin(officialSources, eq(officialNotices.sourceId, officialSources.id))
    .where(
      and(
        eq(noticeImpactProposals.firmId, session.firm.id),
        eq(noticeImpactProposals.id, proposalId),
        eq(officialNotices.alertVisibility, "workspace_alert"),
        inArray(officialNotices.confidenceLabel, ["high", "medium"]),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Notice proposal was not found.",
    });
  }

  if (row.notice.alertVisibility !== "workspace_alert" || row.notice.confidenceLabel === "low") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Notice proposal was not found.",
    });
  }

  return row;
}

async function applyProposalWorkspacePatch({
  ctx,
  now,
  row,
  session,
}: {
  ctx: Context;
  now: Date;
  row: ProposalDecisionRow;
  session: FirmSession;
}): Promise<Record<string, unknown>> {
  if (row.proposal.proposalType === "task_update") {
    return applyTaskUpdateProposal({ ctx, now, row, session });
  }

  return applyCoverageUpdateProposal({ ctx, now, row, session });
}

async function applyTaskUpdateProposal({
  ctx,
  now,
  row,
  session,
}: {
  ctx: Context;
  now: Date;
  row: ProposalDecisionRow;
  session: FirmSession;
}) {
  if (!row.proposal.deadlineTaskId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Task update proposal is missing its deadline task target.",
    });
  }

  const patch = taskPatchSchema.parse(row.proposal.afterState);
  const [task] = await ctx.db
    .select()
    .from(deadlineTasks)
    .where(
      and(
        eq(deadlineTasks.firmId, session.firm.id),
        eq(deadlineTasks.id, row.proposal.deadlineTaskId),
      ),
    )
    .limit(1);

  if (!task) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Affected deadline task was not found.",
    });
  }

  const updateSet = buildTaskUpdateSet(task, patch, now);

  if (!Object.keys(updateSet).length) {
    return row.proposal.afterState;
  }

  const [updatedTask] = await ctx.db
    .update(deadlineTasks)
    .set(updateSet)
    .where(and(eq(deadlineTasks.firmId, session.firm.id), eq(deadlineTasks.id, task.id)))
    .returning();

  if (!updatedTask) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Affected deadline task could not be updated.",
    });
  }

  return {
    ...row.proposal.afterState,
    appliedTask: serializeTaskPatchState(updatedTask),
  };
}

function buildTaskUpdateSet(
  task: DeadlineTask,
  patch: z.infer<typeof taskPatchSchema>,
  now: Date,
): Partial<DeadlineTask> {
  const updateSet: Partial<DeadlineTask> = {};

  if (patch.currentDueDate !== undefined && patch.currentDueDate !== task.currentDueDate) {
    updateSet.currentDueDate = patch.currentDueDate;
    updateSet.originalDueDate = patch.originalDueDate ?? task.originalDueDate ?? task.currentDueDate;
  } else if (patch.originalDueDate !== undefined && patch.originalDueDate !== task.originalDueDate) {
    updateSet.originalDueDate = patch.originalDueDate;
  }

  if (patch.firmTargetDate !== undefined && patch.firmTargetDate !== task.firmTargetDate) {
    updateSet.firmTargetDate = patch.firmTargetDate;
  }

  if (patch.status !== undefined && patch.status !== task.status) {
    updateSet.status = patch.status;
  }

  if (Object.keys(updateSet).length) {
    updateSet.updatedAt = now;
  }

  return updateSet;
}

function serializeTaskPatchState(task: DeadlineTask) {
  return {
    currentDueDate: task.currentDueDate,
    originalDueDate: task.originalDueDate,
    firmTargetDate: task.firmTargetDate,
    status: task.status,
  };
}

async function applyCoverageUpdateProposal({
  ctx,
  now,
  row,
  session,
}: {
  ctx: Context;
  now: Date;
  row: ProposalDecisionRow;
  session: FirmSession;
}) {
  if (!row.proposal.filingProfileId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Coverage review proposal is missing its filing profile target.",
    });
  }

  const patch = coveragePatchSchema.parse(row.proposal.afterState);
  const [profile] = await ctx.db
    .select()
    .from(filingProfiles)
    .where(
      and(
        eq(filingProfiles.firmId, session.firm.id),
        eq(filingProfiles.id, row.proposal.filingProfileId),
      ),
    )
    .limit(1);

  if (!profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Affected filing profile was not found.",
    });
  }

  if (profile.coverageState === patch.coverageState) {
    return row.proposal.afterState;
  }

  const [updatedProfile] = await ctx.db
    .update(filingProfiles)
    .set({ coverageState: patch.coverageState, updatedAt: now })
    .where(and(eq(filingProfiles.firmId, session.firm.id), eq(filingProfiles.id, profile.id)))
    .returning();

  if (!updatedProfile) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Affected filing profile could not be updated.",
    });
  }

  return {
    ...row.proposal.afterState,
    appliedProfile: serializeCoveragePatchState(updatedProfile),
  };
}

function serializeCoveragePatchState(profile: FilingProfile) {
  return {
    coverageState: profile.coverageState,
  };
}

async function recordProposalAudit({
  action,
  bulkActionId,
  ctx,
  now,
  row,
  session,
  workspaceAfterState,
}: {
  action: NoticeProposalActionType;
  bulkActionId: string | null;
  ctx: Context;
  now: Date;
  row: ProposalDecisionRow;
  session: FirmSession;
  workspaceAfterState: Record<string, unknown>;
}) {
  const auditLogId = crypto.randomUUID();
  const entity =
    row.proposal.deadlineTaskId
      ? { type: "deadline_task", id: row.proposal.deadlineTaskId }
      : { type: "filing_profile", id: row.proposal.filingProfileId ?? row.proposal.id };

  await ctx.db.insert(auditLogs).values({
    id: auditLogId,
    firmId: session.firm.id,
    actorType: "user",
    actorUserId: session.user.id,
    action: `notice_proposal.${action}`,
    entityType: entity.type,
    entityId: entity.id,
    beforeState: row.proposal.beforeState,
    afterState: workspaceAfterState,
    sourceType: "official_notice",
    sourceId: row.notice.id,
    metadata: {
      bulkActionId,
      confidenceLabel: row.proposal.confidenceLabel,
      noticeTitle: row.notice.noticeTitle,
      noticeUrl: row.notice.noticeUrl,
      proposalId: row.proposal.id,
      proposalType: row.proposal.proposalType,
      sourceName: row.source.agencyName,
      sourceUrl: row.source.sourceUrl,
    },
    createdAt: now,
  });

  await recordWorkspaceHistory({
    action,
    auditLogId,
    ctx,
    now,
    row,
    session,
    workspaceAfterState,
  });

  return auditLogId;
}

async function recordWorkspaceHistory({
  action,
  auditLogId,
  ctx,
  now,
  row,
  session,
  workspaceAfterState,
}: {
  action: NoticeProposalActionType;
  auditLogId: string;
  ctx: Context;
  now: Date;
  row: ProposalDecisionRow;
  session: FirmSession;
  workspaceAfterState: Record<string, unknown>;
}) {
  if (action !== "approve" || row.proposal.proposalType !== "task_update" || !row.proposal.deadlineTaskId) {
    return;
  }

  const before = taskPatchSchema.partial().parse(row.proposal.beforeState);
  const after = taskPatchSchema.partial().parse(workspaceAfterState);

  if (before.currentDueDate !== after.currentDueDate && after.currentDueDate) {
    await ctx.db.insert(deadlineDateEvents).values({
      id: crypto.randomUUID(),
      firmId: session.firm.id,
      deadlineTaskId: row.proposal.deadlineTaskId,
      eventType: "official_relief_change",
      previousCurrentDueDate: before.currentDueDate ?? null,
      newCurrentDueDate: after.currentDueDate,
      previousFirmTargetDate: null,
      newFirmTargetDate: null,
      sourceName: row.notice.noticeTitle,
      sourceUrl: row.notice.noticeUrl,
      sourceSnapshotId: null,
      createdBy: session.user.id,
      auditLogId,
      createdAt: now,
      notes: "Official notice proposal approved by CPA.",
    });
  }

  for (const fieldName of ["currentDueDate", "originalDueDate", "firmTargetDate", "status"] as const) {
    if (before[fieldName] === after[fieldName]) continue;

    await ctx.db.insert(deadlineTaskUpdateRecords).values({
      id: crypto.randomUUID(),
      firmId: session.firm.id,
      deadlineTaskId: row.proposal.deadlineTaskId,
      fieldName,
      previousValue: before[fieldName] ?? null,
      newValue: after[fieldName] ?? null,
      action: "notice_proposal.approve",
      auditLogId,
      actorUserId: session.user.id,
      createdAt: now,
    });
  }
}
