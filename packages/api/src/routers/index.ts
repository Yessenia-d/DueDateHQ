import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { clientsRouter } from "./clients";
import { coverageRouter } from "./coverage";
import { deadlineTasksRouter } from "./deadlineTasks";
import { filingProfilesRouter } from "./filingProfiles";
import { progressRouter } from "./progress";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  auth: authRouter,
  clients: clientsRouter,
  coverage: coverageRouter,
  deadlineTasks: deadlineTasksRouter,
  filingProfiles: filingProfilesRouter,
  progress: progressRouter,
});
export type AppRouter = typeof appRouter;
