import { protectedProcedure, publicProcedure, router } from "../index";
import { areaRouter } from "./area";
import { auditRouter } from "./audit";
import { hiringRouter } from "./hiring";
import { payrollRouter } from "./payroll";
import { positionRouter } from "./position";
import { providerRouter } from "./provider";
import { purchaseRouter } from "./purchase";
import { recessRouter } from "./recess";
import { remunerationRouter } from "./remuneration";
import { terminationRouter } from "./termination";
import { userRouter } from "./user";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  user: userRouter,
  area: areaRouter,
  position: positionRouter,
  provider: providerRouter,
  payroll: payrollRouter,
  recess: recessRouter,
  termination: terminationRouter,
  hiring: hiringRouter,
  purchase: purchaseRouter,
  remuneration: remunerationRouter,
  audit: auditRouter,
});
export type AppRouter = typeof appRouter;
