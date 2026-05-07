import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { promotionsTable } from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

const router: IRouter = Router();
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/promotions", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const conditions = [eq(promotionsTable.guildId, guildId)];
  if (req.query.staffId) conditions.push(eq(promotionsTable.staffId, req.query.staffId as string));
  const promotions = await db.select().from(promotionsTable).where(and(...conditions)).orderBy(desc(promotionsTable.createdAt)).limit(limit).offset(offset);
  return res.json(promotions);
});

export default router;
