import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { applicationsTable, applicationQuestionsTable } from "@workspace/db/schema";
import { eq, and, count, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

const router: IRouter = Router();
function requireAuth(req: any, res: any, next: any) {
  if (!(req.session as any)?.user) return res.status(401).json({ error: "Not authenticated" });
  next();
}

router.get("/guilds/:guildId/applications", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const conditions = [eq(applicationsTable.guildId, guildId)];
  if (req.query.status) conditions.push(eq(applicationsTable.status, req.query.status as any));
  const apps = await db.select().from(applicationsTable).where(and(...conditions)).orderBy(desc(applicationsTable.submittedAt)).limit(limit).offset(offset);
  const [total] = await db.select({ total: count() }).from(applicationsTable).where(and(...conditions));
  return res.json({ applications: apps, total: total.total, page, totalPages: Math.ceil(total.total / limit) });
});

router.post("/guilds/:guildId/applications/:applicationId/accept", requireAuth, async (req, res) => {
  const { guildId, applicationId } = req.params;
  const user = (req.session as any).user;
  const updated = await db.update(applicationsTable)
    .set({ status: "accepted", reviewerId: user.id, reviewerUsername: user.username, reviewNotes: req.body.notes ?? null, reviewedAt: new Date() })
    .where(and(eq(applicationsTable.id, applicationId), eq(applicationsTable.guildId, guildId)))
    .returning();
  if (!updated[0]) return res.status(404).json({ error: "Application not found" });
  return res.json(updated[0]);
});

router.post("/guilds/:guildId/applications/:applicationId/deny", requireAuth, async (req, res) => {
  const { guildId, applicationId } = req.params;
  const user = (req.session as any).user;
  const updated = await db.update(applicationsTable)
    .set({ status: "denied", reviewerId: user.id, reviewerUsername: user.username, reviewNotes: req.body.notes ?? null, reviewedAt: new Date() })
    .where(and(eq(applicationsTable.id, applicationId), eq(applicationsTable.guildId, guildId)))
    .returning();
  if (!updated[0]) return res.status(404).json({ error: "Application not found" });
  return res.json(updated[0]);
});

router.get("/guilds/:guildId/questions", requireAuth, async (req, res) => {
  const questions = await db.select().from(applicationQuestionsTable).where(eq(applicationQuestionsTable.guildId, req.params.guildId)).orderBy(asc(applicationQuestionsTable.position));
  return res.json(questions);
});

router.post("/guilds/:guildId/questions", requireAuth, async (req, res) => {
  const { question, placeholder, isRequired, position } = req.body;
  if (!question) return res.status(400).json({ error: "question is required" });
  const q = await db.insert(applicationQuestionsTable).values({
    id: nanoid(21), guildId: req.params.guildId, question, placeholder: placeholder ?? null,
    isRequired: isRequired ?? true, position: position ?? 0,
  }).returning();
  return res.status(201).json(q[0]);
});

router.patch("/guilds/:guildId/questions/:questionId", requireAuth, async (req, res) => {
  const { guildId, questionId } = req.params;
  const allowed = ["question", "placeholder", "isRequired", "position"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in req.body) updates[key] = req.body[key];
  const updated = await db.update(applicationQuestionsTable).set(updates).where(and(eq(applicationQuestionsTable.id, questionId), eq(applicationQuestionsTable.guildId, guildId))).returning();
  if (!updated[0]) return res.status(404).json({ error: "Question not found" });
  return res.json(updated[0]);
});

router.delete("/guilds/:guildId/questions/:questionId", requireAuth, async (req, res) => {
  const { guildId, questionId } = req.params;
  await db.delete(applicationQuestionsTable).where(and(eq(applicationQuestionsTable.id, questionId), eq(applicationQuestionsTable.guildId, guildId)));
  return res.status(204).send();
});

export default router;
