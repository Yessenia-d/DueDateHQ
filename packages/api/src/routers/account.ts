import { eq } from "drizzle-orm";
import {
  clientRelationships,
  deadlineTasks,
  type DeadlineTask,
} from "@due-date-hq/db/schema/deadline-domain";
import type { Firm } from "@due-date-hq/db/schema/firms";

import { requireFirmSession } from "../context";
import { publicProcedure, router } from "../index";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type AchievementTask = Pick<DeadlineTask, "status">;
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
  };
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
  const completedDeadlineTasks = tasks.filter((task) => task.status === "done").length;
  const totalDeadlineTasks = tasks.length;
  const remainingDeadlineTasks = totalDeadlineTasks - completedDeadlineTasks;

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
    },
  };
}

export const accountRouter = router({
  achievements: publicProcedure.query(async ({ ctx }) => {
    const session = requireFirmSession(ctx);

    const [clients, tasks] = await Promise.all([
      ctx.db
        .select({ id: clientRelationships.id })
        .from(clientRelationships)
        .where(eq(clientRelationships.firmId, session.firm.id)),
      ctx.db
        .select({ status: deadlineTasks.status })
        .from(deadlineTasks)
        .where(eq(deadlineTasks.firmId, session.firm.id)),
    ]);

    return createAchievementMetrics({
      firm: session.firm,
      tasks,
      totalClientRelationships: clients.length,
    });
  }),
});
