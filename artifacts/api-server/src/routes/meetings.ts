import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { meetingsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/meetings", requireAuth, async (req, res) => {
  const meetings = await db.select().from(meetingsTable).where(eq(meetingsTable.guildId, req.params.guildId)).orderBy(desc(meetingsTable.scheduledAt));
  return res.json(meetings);
});

router.post("/guilds/:guildId/meetings", requireAuth, async (req, res) => {
  const { title, description, hostId, hostUsername, channelId, scheduledAt } = req.body;
  if (!title || !hostId || !scheduledAt) return res.status(400).json({ error: "title, hostId, scheduledAt required" });
  const meeting = await db.insert(meetingsTable).values({
    id: nanoid(21), guildId: req.params.guildId, title, description: description ?? null,
    hostId, hostUsername: hostUsername ?? hostId, channelId: channelId ?? null,
    scheduledAt: new Date(scheduledAt),
  }).returning();
  return res.status(201).json(meeting[0]);
});

export default router;
