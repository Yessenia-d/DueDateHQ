import { and, eq } from "drizzle-orm";
import {
  clientRelationships,
  deadlineTasks,
  filingProfiles,
  type DeadlineTask,
  type FilingProfile,
} from "@due-date-hq/db/schema/deadline-domain";
import { user as authUser } from "@due-date-hq/db/schema/auth";
import type { Firm } from "@due-date-hq/db/schema/firms";
import { z } from "zod";

import { requireFirmSession } from "../context";
import { publicProcedure, router } from "../index";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type AchievementTask = Pick<DeadlineTask, "jurisdiction" | "status" | "taxCategory"> &
  Pick<FilingProfile, "entityType" | "states">;
type AchievementFirm = Pick<Firm, "createdAt" | "id" | "name">;

export type AccountAchievementsResponse = {
  generatedAt: string;
  workspace: {
    id: string;
    name: string;
    createdAt: string;
    usageStartDate: string;
  };
  metrics: {
    totalUsageDays: number;
    currentUsageDay: number;
    totalClientRelationships: number;
    totalDeadlineTasks: number;
    completedDeadlineTasks: number;
    remainingDeadlineTasks: number;
    averageCompletedTasksPerDay: number;
    handledStateCount: number;
    handledTaxCategoryCount: number;
    handledEntityTypeCount: number;
  };
  completedWork: {
    states: AccountAchievementBreakdown[];
    taxCategories: AccountAchievementBreakdown[];
    entityTypes: AccountAchievementBreakdown[];
  };
};

export type AccountAchievementBreakdown = {
  label: string;
  count: number;
  percent: number;
};

function utcDateKey(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function utcStartOfDayMs(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function getInclusiveUsageDay(startedAt: Date, today: Date): number {
  const elapsedDays = Math.floor(
    (utcStartOfDayMs(today) - utcStartOfDayMs(startedAt)) / MS_PER_DAY,
  );

  return Math.max(1, elapsedDays + 1);
}

export function createAchievementMetrics({
  firm,
  tasks,
  today = new Date(),
  totalClientRelationships,
}: {
  firm: AchievementFirm;
  tasks: readonly AchievementTask[];
  today?: Date;
  totalClientRelationships: number;
}): AccountAchievementsResponse {
  const totalUsageDays = getInclusiveUsageDay(firm.createdAt, today);
  const completedTasks = tasks.filter((task) => task.status === "done");
  const completedDeadlineTasks = completedTasks.length;
  const totalDeadlineTasks = tasks.length;
  const remainingDeadlineTasks = totalDeadlineTasks - completedDeadlineTasks;
  const completedWork = createCompletedWorkBreakdowns(completedTasks);

  return {
    generatedAt: today.toISOString(),
    workspace: {
      id: firm.id,
      name: firm.name,
      createdAt: firm.createdAt.toISOString(),
      usageStartDate: utcDateKey(firm.createdAt),
    },
    metrics: {
      totalUsageDays,
      currentUsageDay: totalUsageDays,
      totalClientRelationships,
      totalDeadlineTasks,
      completedDeadlineTasks,
      remainingDeadlineTasks,
      averageCompletedTasksPerDay: Number(
        (completedDeadlineTasks / totalUsageDays).toFixed(1),
      ),
      handledStateCount: completedWork.states.length,
      handledTaxCategoryCount: completedWork.taxCategories.length,
      handledEntityTypeCount: completedWork.entityTypes.length,
    },
    completedWork,
  };
}

function createCompletedWorkBreakdowns(tasks: readonly AchievementTask[]) {
  return {
    states: createBreakdown(tasks.flatMap(getHandledStateLabels)),
    taxCategories: createBreakdown(tasks.map((task) => task.taxCategory)),
    entityTypes: createBreakdown(tasks.map((task) => task.entityType)),
  };
}

function createBreakdown(labels: readonly string[]): AccountAchievementBreakdown[] {
  const counts = new Map<string, number>();

  for (const label of labels) {
    const normalized = label.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);

  return [...counts.entries()]
    .sort(([labelA, countA], [labelB, countB]) => countB - countA || labelA.localeCompare(labelB))
    .map(([label, count]) => ({
      label,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

function getHandledStateLabels(task: AchievementTask): string[] {
  const labels = new Set<string>();

  for (const state of task.states) {
    labels.add(formatJurisdictionLabel(state));
  }

  if (task.jurisdiction.toLowerCase() === "federal") {
    labels.add("Federal");
  } else {
    labels.add(formatJurisdictionLabel(task.jurisdiction));
  }

  return [...labels];
}

function formatJurisdictionLabel(value: string): string {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "federal") return "Federal";
  if (trimmed.length <= 3) return trimmed.toUpperCase();

  return trimmed;
}

export const accountRouter = router({
  updateAvatar: publicProcedure
    .input(
      z.object({
        image: z.string().trim().url().max(2000).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = requireFirmSession(ctx);
      const updatedAt = new Date();

      await ctx.db
        .update(authUser)
        .set({ image: input.image, updatedAt })
        .where(eq(authUser.id, session.user.id));

      return {
        image: input.image,
        updatedAt: updatedAt.toISOString(),
      };
    }),

  achievements: publicProcedure.query(async ({ ctx }) => {
    const session = requireFirmSession(ctx);

    const [clients, tasks] = await Promise.all([
      ctx.db
        .select({ id: clientRelationships.id })
        .from(clientRelationships)
        .where(eq(clientRelationships.firmId, session.firm.id)),
      ctx.db
        .select({
          entityType: filingProfiles.entityType,
          jurisdiction: deadlineTasks.jurisdiction,
          states: filingProfiles.states,
          status: deadlineTasks.status,
          taxCategory: deadlineTasks.taxCategory,
        })
        .from(deadlineTasks)
        .innerJoin(
          filingProfiles,
          and(
            eq(deadlineTasks.firmId, filingProfiles.firmId),
            eq(deadlineTasks.clientRelationshipId, filingProfiles.clientRelationshipId),
            eq(deadlineTasks.filingProfileId, filingProfiles.id),
          ),
        )
        .where(eq(deadlineTasks.firmId, session.firm.id)),
    ]);

    return createAchievementMetrics({
      firm: session.firm,
      tasks,
      totalClientRelationships: clients.length,
    });
  }),
});
