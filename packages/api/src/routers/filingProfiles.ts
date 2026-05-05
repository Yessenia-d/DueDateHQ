import { and, eq } from "drizzle-orm";
import {
  clientRelationships,
  filingProfileEntityTypes,
  filingProfiles,
  fiscalYearTypes,
} from "@due-date-hq/db/schema/deadline-domain";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireFirmSession } from "../context";
import { publicProcedure, router } from "../index";
import { serializeFilingProfile } from "./clients";

const optionalTextSchema = z.string().trim().max(2000).optional();

function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeStates(states: string[]): string[] {
  return [...new Set(states.map((state) => state.trim().toUpperCase()).filter(Boolean))];
}

export const filingProfilesRouter = router({
  createManual: publicProcedure
    .input(
      z.object({
        clientRelationshipId: z.string().trim().min(1),
        displayName: z.string().trim().min(1).max(200),
        entityType: z.enum(filingProfileEntityTypes),
        states: z.array(z.string().trim().min(1).max(32)).max(20).default([]),
        county: optionalTextSchema,
        fiscalYearType: z.enum(fiscalYearTypes),
        notes: optionalTextSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);

      const [client] = await ctx.db
        .select()
        .from(clientRelationships)
        .where(
          and(
            eq(clientRelationships.firmId, session.firm.id),
            eq(clientRelationships.id, input.clientRelationshipId),
          ),
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client relationship was not found.",
        });
      }

      const now = new Date();
      const [profile] = await ctx.db
        .insert(filingProfiles)
        .values({
          id: crypto.randomUUID(),
          firmId: session.firm.id,
          clientRelationshipId: client.id,
          displayName: input.displayName,
          ein: null,
          ssnLast4: null,
          entityType: input.entityType,
          states: normalizeStates(input.states),
          county: nullableText(input.county),
          fiscalYearType: input.fiscalYearType,
          coverageState: "needs_review",
          notes: nullableText(input.notes),
          sourceSystem: "manual",
          sourceRowId: null,
          createdVia: "manual",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!profile) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Filing profile could not be created.",
        });
      }

      return {
        profile: serializeFilingProfile(profile),
      };
    }),
});
