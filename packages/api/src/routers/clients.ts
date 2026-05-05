import { and, asc, eq, gte, lte } from "drizzle-orm";
import {
  clientRelationships,
  clientRelationshipTypes,
  deadlineTaskUpdateRecords,
  deadlineTasks,
  filingProfiles,
  type ClientRelationship,
  type DeadlineTask,
  type FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession } from "../context";
import { publicProcedure, router } from "../index";
import {
  ENTERED_DEADLINE_REFERENCE_LABEL,
  getDeadlineRecurrenceLabel,
  getDeadlineReferenceNote,
  getDeadlineTrustLabel,
} from "../lib/deadline-labels";

const optionalTextSchema = z.string().trim().max(2000).optional();

export type ClientRelationshipResponse = {
  id: string;
  displayName: string;
  relationshipType: ClientRelationship["relationshipType"];
  notes: string | null;
  createdVia: ClientRelationship["createdVia"];
  createdAt: string;
  updatedAt: string;
};

export type ClientListItemResponse = ClientRelationshipResponse & {
  filingProfileCount: number;
  deadlineTaskCount: number;
};

export type ClientListResponse = {
  clients: ClientListItemResponse[];
};

export type FilingProfileResponse = {
  id: string;
  clientRelationshipId: string;
  displayName: string;
  entityType: FilingProfile["entityType"];
  states: string[];
  county: string | null;
  fiscalYearType: FilingProfile["fiscalYearType"];
  coverageState: FilingProfile["coverageState"];
  notes: string | null;
  createdVia: FilingProfile["createdVia"];
  createdAt: string;
  updatedAt: string;
};

export type DeadlineTaskResponse = {
  id: string;
  clientRelationshipId: string;
  filingProfileId: string;
  taxRuleId: string | null;
  title: string;
  jurisdiction: string;
  taxCategory: string;
  currentDueDate: string;
  originalDueDate: string | null;
  firmTargetDate: string | null;
  recurrenceKey: string | null;
  status: DeadlineTask["status"];
  priority: DeadlineTask["priority"];
  sourceType: DeadlineTask["sourceType"];
  createdVia: DeadlineTask["createdVia"];
  enteredDeadlineReferenceNote: string | null;
  trustLabel: string;
  referenceLabel: string | null;
  referenceNote: string | null;
  recurrenceLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientDetailResponse = {
  client: ClientRelationshipResponse;
  profiles: FilingProfileResponse[];
  deadlines: DeadlineTaskResponse[];
};

export type CalendarDeadlineItem = DeadlineTaskResponse & {
  profileDisplayName: string;
  month: number;
  day: number;
  isOverdue: boolean;
  isOfficial: boolean;
};

export type CalendarMonthBucket = {
  month: number;
  label: string;
  count: number;
  deadlines: CalendarDeadlineItem[];
};

export type ClientYearCalendarResponse = {
  client: ClientRelationshipResponse;
  profiles: FilingProfileResponse[];
  year: number;
  availableYears: number[];
  months: CalendarMonthBucket[];
  deadlines: CalendarDeadlineItem[];
};

const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isMissingTaskUpdateRecordsTable(error: unknown): boolean {
  return error instanceof Error && error.message.includes("deadline_task_update_records");
}

function serializeDate(value: Date): string {
  return value.toISOString();
}

function countByClientRelationship(
  rows: readonly { clientRelationshipId: string }[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.clientRelationshipId, (counts.get(row.clientRelationshipId) ?? 0) + 1);
  }

  return counts;
}

export function serializeClientRelationship(
  client: ClientRelationship,
): ClientRelationshipResponse {
  return {
    id: client.id,
    displayName: client.displayName,
    relationshipType: client.relationshipType,
    notes: client.notes,
    createdVia: client.createdVia,
    createdAt: serializeDate(client.createdAt),
    updatedAt: serializeDate(client.updatedAt),
  };
}

export function serializeFilingProfile(profile: FilingProfile): FilingProfileResponse {
  return {
    id: profile.id,
    clientRelationshipId: profile.clientRelationshipId,
    displayName: profile.displayName,
    entityType: profile.entityType,
    states: profile.states,
    county: profile.county,
    fiscalYearType: profile.fiscalYearType,
    coverageState: profile.coverageState,
    notes: profile.notes,
    createdVia: profile.createdVia,
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  };
}

export function serializeDeadlineTask(task: DeadlineTask): DeadlineTaskResponse {
  const isEnteredDeadline = task.sourceType === "entered_deadline";

  return {
    id: task.id,
    clientRelationshipId: task.clientRelationshipId,
    filingProfileId: task.filingProfileId,
    taxRuleId: task.taxRuleId,
    title: task.title,
    jurisdiction: task.jurisdiction,
    taxCategory: task.taxCategory,
    currentDueDate: task.currentDueDate,
    originalDueDate: task.originalDueDate,
    firmTargetDate: task.firmTargetDate,
    recurrenceKey: task.recurrenceKey,
    status: task.status,
    priority: task.priority,
    sourceType: task.sourceType,
    createdVia: task.createdVia,
    enteredDeadlineReferenceNote: task.enteredDeadlineReferenceNote,
    trustLabel: getDeadlineTrustLabel(task.sourceType),
    referenceLabel: isEnteredDeadline ? ENTERED_DEADLINE_REFERENCE_LABEL : null,
    referenceNote: isEnteredDeadline ? getDeadlineReferenceNote(task) : null,
    recurrenceLabel: getDeadlineRecurrenceLabel(task),
    createdAt: serializeDate(task.createdAt),
    updatedAt: serializeDate(task.updatedAt),
  };
}

function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);

  return {
    year: year ?? 0,
    month: month ?? 0,
    day: day ?? 0,
  };
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createCalendarMonths(deadlines: readonly CalendarDeadlineItem[]): CalendarMonthBucket[] {
  return monthLabels.map((label, index) => {
    const month = index + 1;
    const monthDeadlines = deadlines.filter((deadline) => deadline.month === month);

    return {
      month,
      label,
      count: monthDeadlines.length,
      deadlines: monthDeadlines,
    };
  });
}

export const clientsRouter = router({
  list: publicProcedure.query(async ({ ctx }): Promise<ClientListResponse> => {
    const session = requireFirmSession(ctx);

    const clients = await ctx.db
      .select()
      .from(clientRelationships)
      .where(eq(clientRelationships.firmId, session.firm.id))
      .orderBy(asc(clientRelationships.displayName));

    if (clients.length === 0) {
      return { clients: [] };
    }

    const profileRows = await ctx.db
      .select({ clientRelationshipId: filingProfiles.clientRelationshipId })
      .from(filingProfiles)
      .where(eq(filingProfiles.firmId, session.firm.id))
      .orderBy(asc(filingProfiles.clientRelationshipId));
    const deadlineRows = await ctx.db
      .select({ clientRelationshipId: deadlineTasks.clientRelationshipId })
      .from(deadlineTasks)
      .where(eq(deadlineTasks.firmId, session.firm.id))
      .orderBy(asc(deadlineTasks.clientRelationshipId));

    const filingProfileCounts = countByClientRelationship(profileRows);
    const deadlineTaskCounts = countByClientRelationship(deadlineRows);

    return {
      clients: clients.map((client) => ({
        ...serializeClientRelationship(client),
        filingProfileCount: filingProfileCounts.get(client.id) ?? 0,
        deadlineTaskCount: deadlineTaskCounts.get(client.id) ?? 0,
      })),
    };
  }),

  createRelationship: publicProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(1).max(200),
        relationshipType: z.enum(clientRelationshipTypes),
        notes: optionalTextSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);
      const now = new Date();

      const [client] = await ctx.db
        .insert(clientRelationships)
        .values({
          id: crypto.randomUUID(),
          firmId: session.firm.id,
          displayName: input.displayName,
          relationshipType: input.relationshipType,
          notes: nullableText(input.notes),
          sourceSystem: "manual",
          createdVia: "manual",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!client) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Client relationship could not be created.",
        });
      }

      return {
        client: serializeClientRelationship(client),
      };
    }),

  updateNotes: publicProcedure
    .input(
      z.object({
        clientRelationshipId: z.string().trim().min(1),
        notes: optionalTextSchema.nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);
      const notes = nullableText(input.notes);
      const [existingClient] = await ctx.db
        .select()
        .from(clientRelationships)
        .where(
          and(
            eq(clientRelationships.firmId, session.firm.id),
            eq(clientRelationships.id, input.clientRelationshipId),
          ),
        )
        .limit(1);

      if (!existingClient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client relationship was not found.",
        });
      }

      if (existingClient.notes === notes) {
        return {
          client: serializeClientRelationship(existingClient),
        };
      }

      const now = new Date();
      const [client] = await ctx.db
        .update(clientRelationships)
        .set({
          notes,
          updatedAt: now,
        })
        .where(
          and(
            eq(clientRelationships.firmId, session.firm.id),
            eq(clientRelationships.id, input.clientRelationshipId),
          ),
        )
        .returning();

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client relationship was not found.",
        });
      }

      const affectedTasks = await ctx.db
        .select()
        .from(deadlineTasks)
        .where(
          and(
            eq(deadlineTasks.firmId, session.firm.id),
            eq(deadlineTasks.clientRelationshipId, input.clientRelationshipId),
          ),
        )
        .orderBy(asc(deadlineTasks.currentDueDate), asc(deadlineTasks.title));

      try {
        for (const task of affectedTasks) {
          await ctx.db.insert(deadlineTaskUpdateRecords).values({
            id: crypto.randomUUID(),
            firmId: session.firm.id,
            deadlineTaskId: task.id,
            fieldName: "notes",
            previousValue: existingClient.notes,
            newValue: client.notes,
            action: "client_relationship.update_notes",
            auditLogId: null,
            actorUserId: session.user.id,
            createdAt: now,
          });
        }
      } catch (error) {
        if (!isMissingTaskUpdateRecordsTable(error)) {
          throw error;
        }
      }

      return {
        client: serializeClientRelationship(client),
      };
    }),

  get: publicProcedure
    .input(z.object({ clientId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }): Promise<ClientDetailResponse> => {
      const session = requireFirmSession(ctx);

      const [client] = await ctx.db
        .select()
        .from(clientRelationships)
        .where(
          and(
            eq(clientRelationships.firmId, session.firm.id),
            eq(clientRelationships.id, input.clientId),
          ),
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client relationship was not found.",
        });
      }

      const profiles = await ctx.db
        .select()
        .from(filingProfiles)
        .where(
          and(
            eq(filingProfiles.firmId, session.firm.id),
            eq(filingProfiles.clientRelationshipId, client.id),
          ),
        )
        .orderBy(asc(filingProfiles.displayName));

      const deadlines = await ctx.db
        .select()
        .from(deadlineTasks)
        .where(
          and(
            eq(deadlineTasks.firmId, session.firm.id),
            eq(deadlineTasks.clientRelationshipId, client.id),
          ),
        )
        .orderBy(asc(deadlineTasks.currentDueDate), asc(deadlineTasks.title));

      return {
        client: serializeClientRelationship(client),
        profiles: profiles.map(serializeFilingProfile),
        deadlines: deadlines.map(serializeDeadlineTask),
      };
    }),

  getYearCalendar: publicProcedure
    .input(
      z.object({
        clientId: z.string().trim().min(1),
        year: z.number().int().min(2000).max(2100),
      }),
    )
    .query(async ({ ctx, input }): Promise<ClientYearCalendarResponse> => {
      const session = requireFirmSession(ctx);

      const [client] = await ctx.db
        .select()
        .from(clientRelationships)
        .where(
          and(
            eq(clientRelationships.firmId, session.firm.id),
            eq(clientRelationships.id, input.clientId),
          ),
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client relationship was not found.",
        });
      }

      const profiles = await ctx.db
        .select()
        .from(filingProfiles)
        .where(
          and(
            eq(filingProfiles.firmId, session.firm.id),
            eq(filingProfiles.clientRelationshipId, client.id),
          ),
        )
        .orderBy(asc(filingProfiles.displayName));
      const profileNames = new Map(profiles.map((profile) => [profile.id, profile.displayName]));
      const allDeadlineDateRows = await ctx.db
        .select({ currentDueDate: deadlineTasks.currentDueDate })
        .from(deadlineTasks)
        .where(
          and(
            eq(deadlineTasks.firmId, session.firm.id),
            eq(deadlineTasks.clientRelationshipId, client.id),
          ),
        )
        .orderBy(asc(deadlineTasks.currentDueDate));
      const yearStart = `${input.year}-01-01`;
      const yearEnd = `${input.year}-12-31`;
      const deadlineRows = await ctx.db
        .select()
        .from(deadlineTasks)
        .where(
          and(
            eq(deadlineTasks.firmId, session.firm.id),
            eq(deadlineTasks.clientRelationshipId, client.id),
            gte(deadlineTasks.currentDueDate, yearStart),
            lte(deadlineTasks.currentDueDate, yearEnd),
          ),
        )
        .orderBy(asc(deadlineTasks.currentDueDate), asc(deadlineTasks.title));
      const today = formatDateKey(new Date());
      const deadlines = deadlineRows
        .map((deadline): CalendarDeadlineItem => {
          const dateParts = parseDateParts(deadline.currentDueDate);

          return {
            ...serializeDeadlineTask(deadline),
            profileDisplayName: profileNames.get(deadline.filingProfileId) ?? "Unknown filing profile",
            month: dateParts.month,
            day: dateParts.day,
            isOverdue: deadline.currentDueDate < today && deadline.status !== "done",
            isOfficial: deadline.sourceType === "verified_rule",
          };
        })
        .sort((left, right) => {
          const dueDateCompare = left.currentDueDate.localeCompare(right.currentDueDate);
          if (dueDateCompare !== 0) return dueDateCompare;

          const profileCompare = left.profileDisplayName.localeCompare(right.profileDisplayName);
          if (profileCompare !== 0) return profileCompare;

          return left.title.localeCompare(right.title);
        });
      const currentYear = new Date().getFullYear();
      const availableYears = [
        ...new Set([
          currentYear,
          currentYear + 1,
          input.year,
          ...allDeadlineDateRows.map((row) => parseDateParts(row.currentDueDate).year),
        ]),
      ].sort((left, right) => left - right);

      return {
        client: serializeClientRelationship(client),
        profiles: profiles.map(serializeFilingProfile),
        year: input.year,
        availableYears,
        months: createCalendarMonths(deadlines),
        deadlines,
      };
    }),
});
