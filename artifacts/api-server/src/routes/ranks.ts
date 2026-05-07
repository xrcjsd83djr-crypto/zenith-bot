import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ranksTable } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/ranks", requireAuth, async (req, res) => {
  const ranks = await db.select().from(ranksTable).where(eq(ranksTable.guildId, req.params.guildId)).orderBy(asc(ranksTable.position));
  return res.json(ranks);
});

router.post("/guilds/:guildId/ranks", requireAuth, async (req, res) => {
  const { name, discordRoleId, position, color, isDefault } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const rank = await db.insert(ranksTable).values({
    id: nanoid(21),
    guildId: req.params.guildId,
    name,
    discordRoleId: discordRoleId ?? null,
    position: position ?? 0,
    color: color ?? "#5865F2",
    isDefault: isDefault ?? false,
    permissions: [],
  }).returning();
  return res.status(201).json(rank[0]);
});

router.patch("/guilds/:guildId/ranks/:rankId", requireAuth, async (req, res) => {
  const { guildId, rankId } = req.params;
  const allowed = ["name", "discordRoleId", "position", "color", "isDefault"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in req.body) updates[key] = req.body[key];
  const updated = await db.update(ranksTable).set(updates).where(and(eq(ranksTable.id, rankId), eq(ranksTable.guildId, guildId))).returning();
  if (!updated[0]) return res.status(404).json({ error: "Rank not found" });
  return res.json(updated[0]);
});

router.delete("/guilds/:guildId/ranks/:rankId", requireAuth, async (req, res) => {
  const { guildId, rankId } = req.params;
  await db.delete(ranksTable).where(and(eq(ranksTable.id, rankId), eq(ranksTable.guildId, guildId)));
  return res.status(204).send();
});

export default router;
