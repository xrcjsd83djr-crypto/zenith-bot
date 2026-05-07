import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import guildsRouter from "./guilds";
import staffRouter from "./staff";
import ranksRouter from "./ranks";
import divisionsRouter from "./divisions";
import applicationsRouter from "./applications";
import strikesRouter from "./strikes";
import loasRouter from "./loas";
import promotionsRouter from "./promotions";
import meetingsRouter from "./meetings";
import premiumRouter from "./premium";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(guildsRouter);
router.use(staffRouter);
router.use(ranksRouter);
router.use(divisionsRouter);
router.use(applicationsRouter);
router.use(strikesRouter);
router.use(loasRouter);
router.use(promotionsRouter);
router.use(meetingsRouter);
router.use(premiumRouter);

export default router;
