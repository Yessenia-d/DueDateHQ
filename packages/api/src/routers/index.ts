import { publicProcedure, router } from "../index";
import { progressRouter } from "./progress";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  progress: progressRouter,
});
export type AppRouter = typeof appRouter;
