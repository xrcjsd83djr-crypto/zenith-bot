import { config } from "./config.js";

const botHeaders = () => ({
  "Content-Type": "application/json",
  "X-Bot-Secret": process.env.BOT_SECRET ?? "",
});

export async function apiRequest<T>(path: string, options: RequestInit = {}, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${config.apiUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { ...botHeaders(), ...(options.headers as Record<string, string> ?? {}) },
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

// Raw fetch helpers — return the full Response so callers can inspect status
const rawFetch = {
  get:    (path: string)             => fetch(`${config.apiUrl}${path}`, { headers: botHeaders() }),
  post:   (path: string, body: any)  => fetch(`${config.apiUrl}${path}`, { method: "POST",   headers: botHeaders(), body: JSON.stringify(body) }),
  patch:  (path: string, body: any)  => fetch(`${config.apiUrl}${path}`, { method: "PATCH",  headers: botHeaders(), body: JSON.stringify(body) }),
  delete: (path: string)             => fetch(`${config.apiUrl}${path}`, { method: "DELETE", headers: botHeaders() }),
};

export const api = {
  // Raw HTTP surface — backwards-compat for any command that calls api.get/post/delete directly
  get:    rawFetch.get,
  post:   rawFetch.post,
  patch:  rawFetch.patch,
  delete: rawFetch.delete,

  guilds: {
    ensure: (guildId: string, name: string, icon: string | null) =>
      rawFetch.patch(`/guilds/${guildId}`, { name, icon }),
  },
  config: {
    get:    (guildId: string)            => apiRequest<any>(`/guilds/${guildId}/config`),
    update: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/config`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  staff: {
    list:   (guildId: string)                             => apiRequest<any[]>(`/guilds/${guildId}/staff`),
    get:    (guildId: string, userId: string)             => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`),
    add:    (guildId: string, data: any)                  => apiRequest<any>(`/guilds/${guildId}/staff`, { method: "POST",  body: JSON.stringify(data) }),
    update: (guildId: string, userId: string, data: any)  => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (guildId: string, userId: string)             => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`, { method: "DELETE" }),
  },
  ranks: {
    list:   (guildId: string)                 => apiRequest<any[]>(`/guilds/${guildId}/ranks`),
    create: (guildId: string, data: any)      => apiRequest<any>(`/guilds/${guildId}/ranks`, { method: "POST", body: JSON.stringify(data) }),
    delete: (guildId: string, rankId: string) => apiRequest<any>(`/guilds/${guildId}/ranks/${rankId}`, { method: "DELETE" }),
  },
  strikes: {
    list:   (guildId: string)                   => apiRequest<any[]>(`/guilds/${guildId}/strikes`),
    create: (guildId: string, data: any)        => apiRequest<any>(`/guilds/${guildId}/strikes`, { method: "POST", body: JSON.stringify(data) }),
    remove: (guildId: string, strikeId: number) => apiRequest<any>(`/guilds/${guildId}/strikes/${strikeId}`, { method: "DELETE" }),
  },
  warnings: {
    list:      (guildId: string, userId?: string)   => apiRequest<any[]>(`/guilds/${guildId}/warnings${userId ? `?userId=${userId}` : ""}`),
    create:    (guildId: string, data: any)         => apiRequest<any>(`/guilds/${guildId}/warnings`, { method: "POST", body: JSON.stringify(data) }),
    remove:    (guildId: string, warningId: string) => apiRequest<any>(`/guilds/${guildId}/warnings/${warningId}`, { method: "DELETE" }),
    clearUser: (guildId: string, userId: string)    => apiRequest<any>(`/guilds/${guildId}/warnings/clear/${userId}`, { method: "DELETE" }),
  },
  blacklist: {
    list:         (guildId: string)              => apiRequest<any[]>(`/guilds/${guildId}/blacklist`),
    add:          (guildId: string, data: any)   => apiRequest<any>(`/guilds/${guildId}/blacklist`, { method: "POST", body: JSON.stringify(data) }),
    removeByUser: (guildId: string, userId: string) => apiRequest<any>(`/guilds/${guildId}/blacklist/user/${userId}`, { method: "DELETE" }),
    checkUser:    (guildId: string, userId: string) => rawFetch.get(`/guilds/${guildId}/blacklist/user/${userId}`),
  },
  loa: {
    list:   (guildId: string)                                     => apiRequest<any[]>(`/guilds/${guildId}/loa`),
    create: (guildId: string, data: any)                          => apiRequest<any>(`/guilds/${guildId}/loa`, { method: "POST", body: JSON.stringify(data) }),
    update: (guildId: string, loaId: number | string, data: any)  => apiRequest<any>(`/guilds/${guildId}/loa/${loaId}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  activity: {
    log: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/activity`, { method: "POST", body: JSON.stringify(data) }),
  },
  premium: {
    check:  (guildId: string)              => apiRequest<{ isPremium: boolean }>(`/guilds/${guildId}/premium`),
    give:   (guildId: string, days: number) => apiRequest<any>(`/admin/give-premium`,   { method: "POST", body: JSON.stringify({ guildId, days }) }),
    revoke: (guildId: string)              => apiRequest<any>(`/admin/revoke-premium`, { method: "POST", body: JSON.stringify({ guildId }) }),
  },
};
