import { and, eq } from "drizzle-orm";
import { auditLogs } from "@due-date-hq/db/schema/audit";
import {
  clientRelationships,
  deadlineDateEvents,
  deadlineTaskPriorities,
  deadlineTasks,
  filingProfiles,
} from "@due-date-hq/db/schema/deadline-domain";
import { verificationRequests } from "@due-date-hq/db/schema/tax-rules";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession, type Context } from "../context";
import { publicProcedure, router } from "../index";
import { ENTERED_DEADLINE_TRUST_LABEL } from "../lib/deadline-labels";
import { serializeDeadlineTask } from "./clients";

const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }, "Use a real calendar date.");

const optionalTextSchema = z.string().trim().max(2000).optional();
const recurrenceSchema = z.enum(["none", "monthly", "quarterly", "annual"]);
const deadlineKindSchema = z.enum(["filing", "payment"]);

type FirmSession = ReturnType<typeof requireFirmSession>;

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function createTaskTitle(formOrObligation: string, deadlineKind: z.infer<typeof deadlineKindSchema>) {
  const kindLabel = deadlineKind === "filing" ? "Filing" : "Payment";
  return `${formOrObligation} ${kindLabel}`;
}

async function requireClientAndProfile({
  clientRelationshipId,
  ctx,
  filingProfileId,
  firmId,
}: {
  clientRelationshipId: string;
  ctx: Context;
  filingProfileId: string;
  firmId: string;
}) {
  const [client] = await ctx.db
    .select()
    .from(clientRelationships)
    .where(
      and(
        eq(clientRelationships.firmId, firmId),
        eq(clientRelationships.id, clientRelationshipId),
      ),
    )
    .limit(1);

  if (!client) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Client relationship was not found.",
    });
  }

  const [profile] = await ctx.db
    .select()
    .from(filingProfiles)
    .where(
      and(
        eq(filingProfiles.firmId, firmId),
        eq(filingProfiles.clientRelationshipId, clientRelationshipId),
        eq(filingProfiles.id, filingProfileId),
      ),
    )
    .limit(1);

  if (!profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Filing profile was not found for this client relationship.",
    });
  }

  return { client, profile };
}

async function recordAuditLog({
  action,
  afterState,
  ctx,
  entityId,
  entityType,
  metadata,
  session,
  sourceId,
}: {
  action: string;
  afterState: Record<string, unknown> | null;
  ctx: Context;
  entityId: string;
  entityType: string;
  metadata: Record<string, unknown> | null;
  session: FirmSession;
  sourceId: string | null;
}) {
  const auditLogId = crypto.randomUUID();

  await ctx.db.insert(auditLogs).values({
    id: auditLogId,
    firmId: session.firm.id,
    actorType: "user",
    actorUserId: session.user.id,
    action,
    entityType,
    entityId,
    beforeState: null,
    afterState,
    sourceType: "manual_entry",
    sourceId,
    metadata,
    createdAt: new Date(),
  });

  return auditLogId;
}

export const deadlineTasksRouter = router({
  createManual: publicProcedure
    .input(
      z.object({
        clientRelationshipId: z.string().trim().min(1),
        filingProfileId: z.string().trim().min(1),
        taxCategory: z.string().trim().min(1).max(120),
        jurisdiction: z.string().trim().min(1).max(80),
        formOrObligation: z.string().trim().min(1).max(200),
        deadlineKind: deadlineKindSchema,
        currentDueDate: dateStringSchema,
        firmTargetDate: dateStringSchema.optional(),
        priority: z.enum(deadlineTaskPriorities).default("normal"),
        recurrence: recurrenceSchema.default("none"),
        referenceNote: z.string().trim().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);
      await requireClientAndProfile({
        clientRelationshipId: input.clientRelationshipId,
        ctx,
        filingProfileId: input.filingProfileId,
        firmId: session.firm.id,
      });

      const now = new Date();
      const [deadline] = await ctx.db
        .insert(deadlineTasks)
        .values({
          id: crypto.randomUUID(),
          firmId: session.firm.id,
          clientRelationshipId: input.clientRelationshipId,
          filingProfileId: input.filingProfileId,
          taxRuleId: null,
          title: createTaskTitle(input.formOrObligation, input.deadlineKind),
          jurisdiction: input.jurisdiction,
          taxCategory: input.taxCategory,
          currentDueDate: input.currentDueDate,
          originalDueDate: null,
          firmTargetDate: input.firmTargetDate ?? null,
          recurrenceKey: input.recurrence === "none" ? null : input.recurrence,
          status: "not_started",
          priority: input.priority,
          sourceType: "entered_deadline",
          createdVia: "manual",
          enteredDeadlineReferenceNote: input.referenceNote,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!deadline) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Entered deadline could not be created.",
        });
      }

      const auditLogId = await recordAuditLog({
        action: "deadline_task.create_manual",
        afterState: {
          id: deadline.id,
          currentDueDate: deadline.currentDueDate,
          firmTargetDate: deadline.firmTargetDate,
          recurrenceKey: deadline.recurrenceKey,
          sourceType: deadline.sourceType,
        },
        ctx,
        entityId: deadline.id,
        entityType: "deadline_task",
        metadata: {
          deadlineKind: input.deadlineKind,
          trustLabel: ENTERED_DEADLINE_TRUST_LABEL,
        },
        session,
        sourceId: deadline.id,
      });

      if (deadline.firmTargetDate) {
        await ctx.db.insert(deadlineDateEvents).values({
          id: crypto.randomUUID(),
          firmId: session.firm.id,
          deadlineTaskId: deadline.id,
          eventType: "firm_target_change",
          previousCurrentDueDate: null,
          newCurrentDueDate: null,
          previousFirmTargetDate: null,
          newFirmTargetDate: deadline.firmTargetDate,
          sourceName: null,
          sourceUrl: null,
          sourceSnapshotId: null,
          createdBy: session.user.id,
          auditLogId,
          createdAt: now,
          notes: "Firm target date added during entered deadline entry.",
        });
      }

      return {
        deadline: serializeDeadlineTask(deadline),
      };
    }),

  requestVerification: publicProcedure
    .input(
      z.object({
        deadlineTaskId: z.string().trim().min(1),
        message: optionalTextSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);
      const [deadline] = await ctx.db
        .select()
        .from(deadlineTasks)
        .where(
          and(
            eq(deadlineTasks.firmId, session.firm.id),
            eq(deadlineTasks.id, input.deadlineTaskId),
          ),
        )
        .limit(1);

      if (!deadline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deadline task was not found.",
        });
      }

      if (deadline.sourceType !== "entered_deadline") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only entered deadlines can be sent for verification.",
        });
      }

      const now = new Date();
      const requestId = crypto.randomUUID();
      await ctx.db.insert(verificationRequests).values({
        id: requestId,
        firmId: session.firm.id,
        requestType: "manual_deadline",
        obligationId: null,
        taxRuleId: null,
        deadlineTaskId: deadline.id,
        status: "open",
        message: nullableText(input.message),
        createdAt: now,
        updatedAt: now,
      });

      await recordAuditLog({
        action: "deadline_task.request_verification",
        afterState: {
          verificationRequestId: requestId,
          deadlineTaskId: deadline.id,
          sourceType: deadline.sourceType,
        },
        ctx,
        entityId: deadline.id,
        entityType: "deadline_task",
        metadata: {
          verificationRequestId: requestId,
          originalTaskMutated: false,
        },
        session,
        sourceId: requestId,
      });

      return {
        success: true,
        requestId,
        status: "open" as const,
        message: "Verification request recorded. The original entered deadline was not changed.",
      };
    }),
});
