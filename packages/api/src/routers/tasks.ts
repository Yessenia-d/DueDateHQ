import { and, asc, eq, inArray } from "drizzle-orm";
import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTaskStatuses,
  deadlineTasks,
  filingProfiles,
  type DeadlineDateEvent,
  type DeadlineTask,
} from "@due-date-hq/db/schema/deadline-domain";
import { taxRules, type TaxRule } from "@due-date-hq/db/schema/tax-rules";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession, type Context } from "../context";
import { publicProcedure, router } from "../index";
import { dateStringSchema } from "./dashboard";

const taskIdSchema = z.string().trim().min(1);

type FirmSession = ReturnType<typeof requireFirmSession>;

export type TaskEvidenceResponse = {
  task: {
    id: string;
    title: string;
    currentDueDate: string;
    originalDueDate: string | null;
    firmTargetDate: string | null;
    status: DeadlineTask["status"];
    priority: DeadlineTask["priority"];
    sourceType: DeadlineTask["sourceType"];
    userProvidedSourceNote: string | null;
  };
  clientRelationship: {
    id: string;
    displayName: string;
  };
  filingProfile: {
    id: string;
    displayName: string;
    entityType: string;
  };
  rule: {
    id: string;
    ruleSummary: string;
    verificationStatus: TaxRule["verificationStatus"];
    sourceName: string | null;
    sourceUrl: string | null;
    lastVerifiedAt: string | null;
    sourceLastCheckedAt: string | null;
    sourceLastChangedAt: string | null;
    verificationNotes: string | null;
    currentVersion: number;
  } | null;
  dateEvents: Array<{
    id: string;
    eventType: DeadlineDateEvent["eventType"];
    previousCurrentDueDate: string | null;
    newCurrentDueDate: string | null;
    previousFirmTargetDate: string | null;
    newFirmTargetDate: string | null;
    sourceName: string | null;
    sourceUrl: string | null;
    createdAt: string;
    notes: string | null;
  }>;
};

function toISOOrNull(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

async function loadFirmTask(ctx: Context, taskId: string) {
  const session = requireFirmSession(ctx);
  const [task] = await ctx.db
    .select()
    .from(deadlineTasks)
    .where(and(eq(deadlineTasks.firmId, session.firm.id), eq(deadlineTasks.id, taskId)))
    .limit(1);

  if (!task) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Deadline task was not found.",
    });
  }

  return { session, task };
}

async function recordTaskAudit({
  action,
  afterState,
  beforeState,
  ctx,
  entityId,
  metadata,
  session,
}: {
  action: string;
  afterState: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  ctx: Context;
  entityId: string;
  metadata: Record<string, unknown> | null;
  session: FirmSession;
}) {
  const auditLogId = crypto.randomUUID();

  await ctx.db.insert(auditLogs).values({
    id: auditLogId,
    firmId: session.firm.id,
    actorType: "user",
    actorUserId: session.user.id,
    action,
    entityType: "deadline_task",
    entityId,
    beforeState,
    afterState,
    sourceType: "system",
    sourceId: entityId,
    metadata,
    createdAt: new Date(),
  });

  return auditLogId;
}

async function updateTaskStatus({
  ctx,
  status,
  taskId,
}: {
  ctx: Context;
  status: DeadlineTask["status"];
  taskId: string;
}) {
  const { session, task } = await loadFirmTask(ctx, taskId);
  const now = new Date();

  const [updated] = await ctx.db
    .update(deadlineTasks)
    .set({ status, updatedAt: now })
    .where(and(eq(deadlineTasks.firmId, session.firm.id), eq(deadlineTasks.id, taskId)))
    .returning();

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Deadline task status could not be updated.",
    });
  }

  await recordTaskAudit({
    action: "deadline_task.update_status",
    beforeState: { status: task.status },
    afterState: { status: updated.status },
    ctx,
    entityId: task.id,
    metadata: { officialDueDateMutated: false },
    session,
  });

  return updated;
}

async function updateFirmTargetDate({
  ctx,
  firmTargetDate,
  taskId,
}: {
  ctx: Context;
  firmTargetDate: string | null;
  taskId: string;
}) {
  const { session, task } = await loadFirmTask(ctx, taskId);
  const now = new Date();

  const [updated] = await ctx.db
    .update(deadlineTasks)
    .set({ firmTargetDate, updatedAt: now })
    .where(and(eq(deadlineTasks.firmId, session.firm.id), eq(deadlineTasks.id, taskId)))
    .returning();

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Firm target date could not be updated.",
    });
  }

  const auditLogId = await recordTaskAudit({
    action: "deadline_task.update_firm_target_date",
    beforeState: { firmTargetDate: task.firmTargetDate },
    afterState: { firmTargetDate: updated.firmTargetDate },
    ctx,
    entityId: task.id,
    metadata: { officialDueDateMutated: false },
    session,
  });

  await ctx.db.insert(deadlineDateEvents).values({
    id: crypto.randomUUID(),
    firmId: session.firm.id,
    deadlineTaskId: task.id,
    eventType: "firm_target_change",
    previousCurrentDueDate: null,
    newCurrentDueDate: null,
    previousFirmTargetDate: task.firmTargetDate,
    newFirmTargetDate: firmTargetDate,
    sourceName: null,
    sourceUrl: null,
    sourceSnapshotId: null,
    createdBy: session.user.id,
    auditLogId,
    createdAt: now,
    notes: "Firm target date updated from the Monday triage dashboard.",
  });

  return updated;
}

export const tasksRouter = router({
  updateStatus: publicProcedure
    .input(z.object({ taskId: taskIdSchema, status: z.enum(deadlineTaskStatuses) }))
    .mutation(async ({ ctx, input }) => {
      const task = await updateTaskStatus({ ctx, taskId: input.taskId, status: input.status });

      return { taskId: task.id, status: task.status };
    }),

  bulkUpdateStatus: publicProcedure
    .input(
      z.object({
        taskIds: z.array(taskIdSchema).min(1).max(200),
        status: z.enum(deadlineTaskStatuses),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = [];

      for (const taskId of input.taskIds) {
        updated.push(await updateTaskStatus({ ctx, taskId, status: input.status }));
      }

      return { updatedCount: updated.length, status: input.status };
    }),

  updateFirmTargetDate: publicProcedure
    .input(
      z.object({
        taskId: taskIdSchema,
        firmTargetDate: dateStringSchema.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await updateFirmTargetDate({
        ctx,
        taskId: input.taskId,
        firmTargetDate: input.firmTargetDate,
      });

      return { taskId: task.id, firmTargetDate: task.firmTargetDate };
    }),

  bulkUpdateFirmTargetDate: publicProcedure
    .input(
      z.object({
        taskIds: z.array(taskIdSchema).min(1).max(200),
        firmTargetDate: dateStringSchema.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = [];

      for (const taskId of input.taskIds) {
        updated.push(
          await updateFirmTargetDate({
            ctx,
            taskId,
            firmTargetDate: input.firmTargetDate,
          }),
        );
      }

      return { updatedCount: updated.length, firmTargetDate: input.firmTargetDate };
    }),

  getEvidence: publicProcedure
    .input(z.object({ taskId: taskIdSchema }))
    .query(async ({ ctx, input }): Promise<TaskEvidenceResponse> => {
      const { session } = await loadFirmTask(ctx, input.taskId);
      const [row] = await ctx.db
        .select({
          task: deadlineTasks,
          client: clientRelationships,
          profile: filingProfiles,
          rule: taxRules,
        })
        .from(deadlineTasks)
        .innerJoin(
          clientRelationships,
          and(
            eq(deadlineTasks.firmId, clientRelationships.firmId),
            eq(deadlineTasks.clientRelationshipId, clientRelationships.id),
          ),
        )
        .innerJoin(
          filingProfiles,
          and(
            eq(deadlineTasks.firmId, filingProfiles.firmId),
            eq(deadlineTasks.clientRelationshipId, filingProfiles.clientRelationshipId),
            eq(deadlineTasks.filingProfileId, filingProfiles.id),
          ),
        )
        .leftJoin(taxRules, eq(deadlineTasks.taxRuleId, taxRules.id))
        .where(and(eq(deadlineTasks.firmId, session.firm.id), eq(deadlineTasks.id, input.taskId)))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deadline task was not found.",
        });
      }

      const events = await ctx.db
        .select()
        .from(deadlineDateEvents)
        .where(
          and(
            eq(deadlineDateEvents.firmId, session.firm.id),
            inArray(deadlineDateEvents.deadlineTaskId, [row.task.id]),
          ),
        )
        .orderBy(asc(deadlineDateEvents.createdAt));

      return {
        task: {
          id: row.task.id,
          title: row.task.title,
          currentDueDate: row.task.currentDueDate,
          originalDueDate: row.task.originalDueDate,
          firmTargetDate: row.task.firmTargetDate,
          status: row.task.status,
          priority: row.task.priority,
          sourceType: row.task.sourceType,
          userProvidedSourceNote: row.task.userProvidedSourceNote,
        },
        clientRelationship: {
          id: row.client.id,
          displayName: row.client.displayName,
        },
        filingProfile: {
          id: row.profile.id,
          displayName: row.profile.displayName,
          entityType: row.profile.entityType,
        },
        rule: row.rule
          ? {
              id: row.rule.id,
              ruleSummary: row.rule.ruleSummary,
              verificationStatus: row.rule.verificationStatus,
              sourceName: row.rule.sourceName,
              sourceUrl: row.rule.sourceUrl,
              lastVerifiedAt: toISOOrNull(row.rule.lastVerifiedAt),
              sourceLastCheckedAt: toISOOrNull(row.rule.sourceLastCheckedAt),
              sourceLastChangedAt: toISOOrNull(row.rule.sourceLastChangedAt),
              verificationNotes: row.rule.verificationNotes,
              currentVersion: row.rule.currentVersion,
            }
          : null,
        dateEvents: events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          previousCurrentDueDate: event.previousCurrentDueDate,
          newCurrentDueDate: event.newCurrentDueDate,
          previousFirmTargetDate: event.previousFirmTargetDate,
          newFirmTargetDate: event.newFirmTargetDate,
          sourceName: event.sourceName,
          sourceUrl: event.sourceUrl,
          createdAt: event.createdAt.toISOString(),
          notes: event.notes,
        })),
      };
    }),
});
