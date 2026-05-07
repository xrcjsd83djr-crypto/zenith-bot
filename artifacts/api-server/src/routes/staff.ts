import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { staffTable, ranksTable, divisionsTable } from "@workspace/db/schema";
import { eq, and, ilike, count, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/staff", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const { rankId, divisionId } = req.query;

  const conditions = [eq(staffTable.guildId, guildId)];
  if (rankId && typeof rankId === "string") conditions.push(eq(staffTable.rankId, rankId));
  if (divisionId && typeof divisionId === "string") conditions.push(eq(staffTable.divisionId, divisionId));

  const allStaff = await db
    .select({
      id: staffTable.id, guildId: staffTable.guildId, discordId: staffTable.discordId,
      discordUsername: staffTable.discordUsername, discordAvatarUrl: staffTable.discordAvatarUrl,
      robloxUsername: staffTable.robloxUsername, rankId: staffTable.rankId,
      rankName: ranksTable.name, divisionId: staffTable.divisionId, divisionName: divisionsTable.name,
      callsign: staffTable.callsign, isActive: staffTable.isActive, strikeCount: staffTable.strikeCount,
      joinedAt: staffTable.joinedAt, notes: staffTable.notes,
    })
    .from(staffTable)
    .leftJoin(ranksTable, eq(staffTable.rankId, ranksTable.id))
    .leftJoin(divisionsTable, eq(staffTable.divisionId, divisionsTable.id))
    .where(and(...conditions))
    .orderBy(desc(staffTable.joinedAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db.select({ total: count() }).from(staffTable).where(and(...conditions));

  return res.json({
    staff: allStaff,
    total: totalResult.total,
    page,
    totalPages: Math.ceil(totalResult.total / limit),
  });
});

router.post("/guilds/:guildId/staff", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const { discordId, discordUsername, discordAvatarUrl, robloxUsername, rankId, divisionId, callsign } = req.body;

  if (!discordId || !discordUsername) {
    return res.status(400).json({ error: "discordId and discordUsername are required" });
  }

  const newStaff = await db.insert(staffTable).values({
    id: nanoid(21),
    guildId,
    discordId,
    discordUsername,
    discordAvatarUrl: discordAvatarUrl ?? null,
    robloxUsername: robloxUsername ?? null,
    rankId: rankId ?? null,
    divisionId: divisionId ?? null,
    callsign: callsign ?? null,
  }).returning();

  return res.status(201).json(newStaff[0]);
});

router.get("/guilds/:guildId/staff/:staffId", requireAuth, async (req, res) => {
  const { guildId, staffId } = req.params;
  const [member] = await db
    .select({ id: staffTable.id, guildId: staffTable.guildId, discordId: staffTable.discordId,
      discordUsername: staffTable.discordUsername, discordAvatarUrl: staffTable.discordAvatarUrl,
      robloxUsername: staffTable.robloxUsername, rankId: staffTable.rankId, rankName: ranksTable.name,
      divisionId: staffTable.divisionId, divisionName: divisionsTable.name, callsign: staffTable.callsign,
      isActive: staffTable.isActive, strikeCount: staffTable.strikeCount, joinedAt: staffTable.joinedAt, notes: staffTable.notes,
    })
    .from(staffTable)
    .leftJoin(ranksTable, eq(staffTable.rankId, ranksTable.id))
    .leftJoin(divisionsTable, eq(staffTable.divisionId, divisionsTable.id))
    .where(and(eq(staffTable.id, staffId), eq(staffTable.guildId, guildId)))
    .limit(1);

  if (!member) return res.status(404).json({ error: "Staff member not found" });
  return res.json(member);
});

router.patch("/guilds/:guildId/staff/:staffId", requireAuth, async (req, res) => {
  const { guildId, staffId } = req.params;
  const allowed = ["rankId", "divisionId", "callsign", "robloxUsername", "isActive", "notes"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  const updated = await db.update(staffTable).set(updates).where(and(eq(staffTable.id, staffId), eq(staffTable.guildId, guildId))).returning();
  if (!updated[0]) return res.status(404).json({ error: "Staff member not found" });
  return res.json(updated[0]);
});

router.delete("/guilds/:guildId/staff/:staffId", requireAuth, async (req, res) => {
  const { guildId, staffId } = req.params;
  await db.update(staffTable).set({ isActive: false, updatedAt: new Date() }).where(and(eq(staffTable.id, staffId), eq(staffTable.guildId, guildId)));
  return res.status(204).send();
});

export default router;
