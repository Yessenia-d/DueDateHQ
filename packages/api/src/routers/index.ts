import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { clientsRouter } from "./clients";
import { coverageRouter } from "./coverage";
import { dashboardRouter } from "./dashboard";
import { deadlineTasksRouter } from "./deadlineTasks";
import { filingProfilesRouter } from "./filingProfiles";
import { officialNoticesRouter } from "./officialNotices";
import { officialSourcesRouter } from "./officialSources";
import { progressRouter } from "./progress";
import { tasksRouter } from "./tasks";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  auth: authRouter,
  clients: clientsRouter,
  coverage: coverageRouter,
  dashboard: dashboardRouter,
  deadlineTasks: deadlineTasksRouter,
  filingProfiles: filingProfilesRouter,
  officialNotices: officialNoticesRouter,
  officialSources: officialSourcesRouter,
  progress: progressRouter,
  tasks: tasksRouter,
});
export type AppRouter = typeof appRouter;
