import { config } from "./config.js";

export async function apiRequest<T>(path: string, options: RequestInit = {}, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${config.apiUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Secret": process.env.BOT_SECRET ?? "",
          ...(options.headers ?? {}),
        },
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      if (attempt === retries - 1) throw err;
      console.warn(`[API] Retry ${attempt + 1}/${retries} for ${path}: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("API request failed");
}

export const api = {
  guilds: {
    ensure: (guildId: string, name: string, icon: string | null) =>
      fetch(`${config.apiUrl}/guilds/${guildId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Bot-Secret": process.env.BOT_SECRET ?? "" },
        body: JSON.stringify({ name, icon }),
      }),
  },
  config: {
    get: (guildId: string) => apiRequest<any>(`/guilds/${guildId}/config`),
    update: (guildId: string, data: any) =>
      fetch(`${config.apiUrl}/guilds/${guildId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Bot-Secret": process.env.BOT_SECRET ?? "" },
        body: JSON.stringify(data),
      }),
  },
  staff: {
    list: (guildId: string) => apiRequest<any[]>(`/guilds/${guildId}/staff`),
    get: (guildId: string, userId: string) => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`),
    add: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/staff`, { method: "POST", body: JSON.stringify(data) }),
    update: (guildId: string, userId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (guildId: string, userId: string) => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`, { method: "DELETE" }),
  },
  ranks: {
    list: (guildId: string) => apiRequest<any[]>(`/guilds/${guildId}/ranks`),
    create: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/ranks`, { method: "POST", body: JSON.stringify(data) }),
    delete: (guildId: string, rankId: string) => apiRequest<any>(`/guilds/${guildId}/ranks/${rankId}`, { method: "DELETE" }),
  },
  strikes: {
    list: (guildId: string) => apiRequest<any[]>(`/guilds/${guildId}/strikes`),
    create: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/strikes`, { method: "POST", body: JSON.stringify(data) }),
    remove: (guildId: string, strikeId: number) => apiRequest<any>(`/guilds/${guildId}/strikes/${strikeId}`, { method: "DELETE" }),
  },
  loa: {
    list: (guildId: string) => apiRequest<any[]>(`/guilds/${guildId}/loa`),
    create: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/loa`, { method: "POST", body: JSON.stringify(data) }),
    update: (guildId: string, loaId: number, data: any) => apiRequest<any>(`/guilds/${guildId}/loa/${loaId}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  activity: {
    log: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/activity`, { method: "POST", body: JSON.stringify(data) }),
  },
  premium: {
    check: (guildId: string) => apiRequest<{ isPremium: boolean }>(`/guilds/${guildId}/premium`),
  },
};
