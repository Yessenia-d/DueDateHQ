import { publicProcedure, router } from "../index";
import { accountRouter } from "./account";
import { authRouter } from "./auth";
import { clientsRouter } from "./clients";
import { coverageRouter } from "./coverage";
import { dashboardRouter } from "./dashboard";
import { deadlineTasksRouter } from "./deadlineTasks";
import { filingProfilesRouter } from "./filingProfiles";
import { importsRouter } from "./imports";
import { noticeProposalsRouter } from "./noticeProposals";
import { noticesRouter } from "./notices";
import { officialNoticesRouter } from "./officialNotices";
import { officialSourcesRouter } from "./officialSources";
import { progressRouter } from "./progress";
import { tasksRouter } from "./tasks";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  account: accountRouter,
  auth: authRouter,
  clients: clientsRouter,
  coverage: coverageRouter,
  dashboard: dashboardRouter,
  deadlineTasks: deadlineTasksRouter,
  filingProfiles: filingProfilesRouter,
  imports: importsRouter,
  noticeProposals: noticeProposalsRouter,
  notices: noticesRouter,
  officialNotices: officialNoticesRouter,
  officialSources: officialSourcesRouter,
  progress: progressRouter,
  tasks: tasksRouter,
});
export type AppRouter = typeof appRouter;
