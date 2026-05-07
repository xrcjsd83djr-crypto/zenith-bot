import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { loasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/loas", requireAuth, async (req, res) => {
  const conditions = [eq(loasTable.guildId, req.params.guildId)];
  if (req.query.status) conditions.push(eq(loasTable.status, req.query.status as any));
  if (req.query.staffId) conditions.push(eq(loasTable.staffId, req.query.staffId as string));
  const loas = await db.select().from(loasTable).where(and(...conditions));
  return res.json(loas);
});

router.post("/guilds/:guildId/loas", requireAuth, async (req, res) => {
  const { staffId, reason, startDate, endDate } = req.body;
  if (!staffId || !reason) return res.status(400).json({ error: "staffId and reason required" });
  const loa = await db.insert(loasTable).values({
    id: nanoid(21), guildId: req.params.guildId, staffId, reason, status: "pending",
    startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null,
  }).returning();
  return res.status(201).json(loa[0]);
});

router.post("/guilds/:guildId/loas/:loaId/approve", requireAuth, async (req, res) => {
  const { guildId, loaId } = req.params;
  const { reviewerId, reviewerUsername, notes } = req.body;
  const updated = await db.update(loasTable)
    .set({ status: "approved", reviewerId, reviewerUsername, reviewNotes: notes ?? null, reviewedAt: new Date() })
    .where(and(eq(loasTable.id, loaId), eq(loasTable.guildId, guildId))).returning();
  if (!updated[0]) return res.status(404).json({ error: "LOA not found" });
  return res.json(updated[0]);
});

router.post("/guilds/:guildId/loas/:loaId/deny", requireAuth, async (req, res) => {
  const { guildId, loaId } = req.params;
  const { reviewerId, reviewerUsername, notes } = req.body;
  const updated = await db.update(loasTable)
    .set({ status: "denied", reviewerId, reviewerUsername, reviewNotes: notes ?? null, reviewedAt: new Date() })
    .where(and(eq(loasTable.id, loaId), eq(loasTable.guildId, guildId))).returning();
  if (!updated[0]) return res.status(404).json({ error: "LOA not found" });
  return res.json(updated[0]);
});

export default router;
