import { Router, type IRouter } from "express";

const router: IRouter = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;
const DISCORD_API = "https://discord.com/api/v10";

router.get("/auth/discord", (_req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds",
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

router.get("/auth/discord/callback", async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return res.redirect("/?error=no_code");
  }

  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    const tokens = (await tokenRes.json()) as { access_token: string; token_type: string };
    if (!tokens.access_token) return res.redirect("/?error=token_failed");

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = (await userRes.json()) as { id: string; username: string; discriminator: string; avatar: string | null };

    (req.session as any).user = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`,
      accessToken: tokens.access_token,
    };

    return res.redirect("/dashboard");
  } catch (err) {
    req.log.error({ err }, "OAuth callback error");
    return res.redirect("/?error=auth_failed");
  }
});

router.get("/auth/me", (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  const { accessToken: _token, ...safeUser } = user;
  return res.json(safeUser);
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/guilds", async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    const guilds = (await guildsRes.json()) as Array<{
      id: string; name: string; icon: string | null; permissions: string;
    }>;

    const { db } = await import("@workspace/db");
    const { guildsTable } = await import("@workspace/db/schema");
    const { inArray } = await import("drizzle-orm");

    const ADMIN = BigInt(0x8);
    const manageable = guilds.filter((g) => (BigInt(g.permissions) & ADMIN) === ADMIN);
    const ids = manageable.map((g) => g.id);

    let setupGuildIds: string[] = [];
    if (ids.length > 0) {
      const setup = await db.select({ id: guildsTable.id }).from(guildsTable).where(inArray(guildsTable.id, ids));
      setupGuildIds = setup.map((g) => g.id);
    }

    return res.json(
      manageable.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        isSetup: setupGuildIds.includes(g.id),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch guilds");
    return res.status(500).json({ error: "Failed to fetch guilds" });
  }
});

export default router;
