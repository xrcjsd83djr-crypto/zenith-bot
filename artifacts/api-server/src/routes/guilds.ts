import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { guildsTable, staffTable, applicationsTable, strikesTable, loasTable, promotionsTable, activityLogsTable } from "@workspace/db/schema";
import { eq, and, count, desc, gte } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const guild = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId)).limit(1);
  if (!guild[0]) return res.status(404).json({ error: "Guild not found" });
  return res.json(guild[0]);
});

router.patch("/guilds/:guildId", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const body = req.body;
  const allowed = [
    "staffRoleId", "managementRoleId", "logChannelId", "applicationChannelId",
    "applicationReviewChannelId", "welcomeChannelId", "embedColor", "embedFooter",
    "customBotName", "customBotAvatar",
  ];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  const updated = await db.update(guildsTable).set(updates).where(eq(guildsTable.id, guildId)).returning();
  if (!updated[0]) return res.status(404).json({ error: "Guild not found" });
  return res.json(updated[0]);
});

router.get("/guilds/:guildId/stats", requireAuth, async (req, res) => {
  const { guildId } = req.params;

  const [totalStaffResult] = await db.select({ total: count() }).from(staffTable).where(eq(staffTable.guildId, guildId));
  const [activeStaffResult] = await db.select({ total: count() }).from(staffTable).where(and(eq(staffTable.guildId, guildId), eq(staffTable.isActive, true)));
  const [pendingAppsResult] = await db.select({ total: count() }).from(applicationsTable).where(and(eq(applicationsTable.guildId, guildId), eq(applicationsTable.status, "pending")));
  const [activeStrikesResult] = await db.select({ total: count() }).from(strikesTable).where(and(eq(strikesTable.guildId, guildId), eq(strikesTable.isActive, true)));
  const [activeLoasResult] = await db.select({ total: count() }).from(loasTable).where(and(eq(loasTable.guildId, guildId), eq(loasTable.status, "active")));
  const [promotionsResult] = await db.select({ total: count() }).from(promotionsTable).where(eq(promotionsTable.guildId, guildId));

  const recentLogs = await db.select().from(activityLogsTable)
    .where(eq(activityLogsTable.guildId, guildId))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(10);

  return res.json({
    totalStaff: totalStaffResult.total,
    activeStaff: activeStaffResult.total,
    pendingApplications: pendingAppsResult.total,
    activeStrikes: activeStrikesResult.total,
    activeLoas: activeLoasResult.total,
    totalPromotions: promotionsResult.total,
    recentActivity: recentLogs.map((l) => ({
      type: l.action,
      description: l.details ?? "",
      timestamp: l.createdAt.toISOString(),
      actorUsername: "System",
    })),
  });
});

export default router;
