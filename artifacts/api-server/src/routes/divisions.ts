import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { divisionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/divisions", requireAuth, async (req, res) => {
  const divs = await db.select().from(divisionsTable).where(eq(divisionsTable.guildId, req.params.guildId));
  return res.json(divs);
});

router.post("/guilds/:guildId/divisions", requireAuth, async (req, res) => {
  const { name, description, discordRoleId, channelId, color } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const div = await db.insert(divisionsTable).values({
    id: nanoid(21), guildId: req.params.guildId,
    name, description: description ?? null, discordRoleId: discordRoleId ?? null,
    channelId: channelId ?? null, color: color ?? "#5865F2",
  }).returning();
  return res.status(201).json(div[0]);
});

router.patch("/guilds/:guildId/divisions/:divisionId", requireAuth, async (req, res) => {
  const { guildId, divisionId } = req.params;
  const allowed = ["name", "description", "discordRoleId", "channelId", "color", "isActive"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in req.body) updates[key] = req.body[key];
  const updated = await db.update(divisionsTable).set(updates).where(and(eq(divisionsTable.id, divisionId), eq(divisionsTable.guildId, guildId))).returning();
  if (!updated[0]) return res.status(404).json({ error: "Division not found" });
  return res.json(updated[0]);
});

router.delete("/guilds/:guildId/divisions/:divisionId", requireAuth, async (req, res) => {
  const { guildId, divisionId } = req.params;
  await db.delete(divisionsTable).where(and(eq(divisionsTable.id, divisionId), eq(divisionsTable.guildId, guildId)));
  return res.status(204).send();
});

export default router;
