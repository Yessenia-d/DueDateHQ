import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { progressRouter } from "./progress";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  auth: authRouter,
  progress: progressRouter,
});
export type AppRouter = typeof appRouter;
