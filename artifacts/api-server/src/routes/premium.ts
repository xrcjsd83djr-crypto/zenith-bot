import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { guildsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SUPPORT_SERVER_ID = process.env.SUPPORT_SERVER_ID;
const PREMIUM_ADMIN_IDS = (process.env.PREMIUM_ADMIN_IDS ?? "").split(",").filter(Boolean);

function requirePremiumAdmin(req: any, res: any, next: any) {
  const user = (req.session as any)?.user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  if (!PREMIUM_ADMIN_IDS.includes(user.id)) return res.status(403).json({ error: "Forbidden" });
  next();
}

router.post("/guilds/:guildId/premium", requirePremiumAdmin, async (req, res) => {
  const { guildId } = req.params;
  const { durationDays } = req.body;
  const premiumExpiresAt = durationDays ? new Date(Date.now() + durationDays * 86_400_000) : null;
  const updated = await db.update(guildsTable)
    .set({ isPremium: true, premiumExpiresAt, updatedAt: new Date() })
    .where(eq(guildsTable.id, guildId)).returning();
  if (!updated[0]) return res.status(404).json({ error: "Guild not found" });
  return res.json(updated[0]);
});

router.delete("/guilds/:guildId/premium", requirePremiumAdmin, async (req, res) => {
  const { guildId } = req.params;
  const updated = await db.update(guildsTable)
    .set({ isPremium: false, premiumExpiresAt: null, updatedAt: new Date() })
    .where(eq(guildsTable.id, guildId)).returning();
  if (!updated[0]) return res.status(404).json({ error: "Guild not found" });
  return res.json(updated[0]);
});

export default router;
