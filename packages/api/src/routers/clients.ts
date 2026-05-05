import { and, asc, eq } from "drizzle-orm";
import {
  clientRelationships,
  clientRelationshipTypes,
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
  userProvidedSourceNote: string | null;
  trustLabel: string;
  recurrenceLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientDetailResponse = {
  client: ClientRelationshipResponse;
  profiles: FilingProfileResponse[];
  deadlines: DeadlineTaskResponse[];
};

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function serializeDate(value: Date): string {
  return value.toISOString();
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
  const isUserProvided = task.sourceType === "user_provided";

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
    userProvidedSourceNote: task.userProvidedSourceNote,
    trustLabel: isUserProvided
      ? "User provided - Not verified by DueDateHQ"
      : "Verified by DueDateHQ",
    recurrenceLabel: task.recurrenceKey
      ? "Recurring user-provided deadline"
      : "One-time user-provided deadline",
    createdAt: serializeDate(task.createdAt),
    updatedAt: serializeDate(task.updatedAt),
  };
}

export const clientsRouter = router({
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
});
