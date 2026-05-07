import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { strikesTable, staffTable } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/strikes", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const conditions = [eq(strikesTable.guildId, guildId)];
  if (req.query.staffId) conditions.push(eq(strikesTable.staffId, req.query.staffId as string));
  if (req.query.active === "true") conditions.push(eq(strikesTable.isActive, true));
  const strikes = await db.select().from(strikesTable).where(and(...conditions));
  return res.json(strikes);
});

router.post("/guilds/:guildId/strikes", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const { staffId, issuedById, issuedByUsername, severity, reason, evidence } = req.body;
  if (!staffId || !issuedById || !reason) return res.status(400).json({ error: "staffId, issuedById, reason required" });
  const strike = await db.insert(strikesTable).values({
    id: nanoid(21), guildId, staffId, issuedById, issuedByUsername: issuedByUsername ?? issuedById,
    severity: severity ?? "strike", reason, evidence: evidence ?? null, isActive: true,
  }).returning();
  const [newCount] = await db.select({ total: count() }).from(strikesTable).where(and(eq(strikesTable.staffId, staffId), eq(strikesTable.isActive, true)));
  await db.update(staffTable).set({ strikeCount: newCount.total, updatedAt: new Date() }).where(eq(staffTable.id, staffId));
  return res.status(201).json(strike[0]);
});

router.post("/guilds/:guildId/strikes/:strikeId/remove", requireAuth, async (req, res) => {
  const { guildId, strikeId } = req.params;
  const { removedById } = req.body;
  const updated = await db.update(strikesTable)
    .set({ isActive: false, removedAt: new Date(), removedById: removedById ?? null })
    .where(and(eq(strikesTable.id, strikeId), eq(strikesTable.guildId, guildId)))
    .returning();
  if (!updated[0]) return res.status(404).json({ error: "Strike not found" });
  return res.json(updated[0]);
});

export default router;
