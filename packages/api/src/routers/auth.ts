import { publicProcedure, router } from "../index";
import { requireFirmSession } from "../context";

function serializeFirmSession(session: ReturnType<typeof requireFirmSession>) {
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      createdAt: session.user.createdAt.toISOString(),
      updatedAt: session.user.updatedAt.toISOString(),
    },
    firm: {
      id: session.firm.id,
      name: session.firm.name,
      ownerUserId: session.firm.ownerUserId,
      createdAt: session.firm.createdAt.toISOString(),
      updatedAt: session.firm.updatedAt.toISOString(),
    },
    session: {
      expiresAt: session.session.expiresAt.toISOString(),
    },
  };
}

export const authRouter = router({
  session: publicProcedure.query(({ ctx }) => {
    return ctx.session ? serializeFirmSession(ctx.session) : null;
  }),
  workspace: publicProcedure.query(({ ctx }) => {
    return serializeFirmSession(requireFirmSession(ctx));
  }),
});
