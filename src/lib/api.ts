import { config } from "./config.js";

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Bot-Secret": process.env.BOT_SECRET ?? "",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
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
  staff: {
    list: (guildId: string) => apiRequest<any[]>(`/guilds/${guildId}/staff`),
    get: (guildId: string, userId: string) => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`),
    add: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/staff`, { method: "POST", body: JSON.stringify(data) }),
    update: (guildId: string, userId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (guildId: string, userId: string) => apiRequest<any>(`/guilds/${guildId}/staff/${userId}`, { method: "DELETE" }),
  },
  ranks: {
    list: (guildId: string) => apiRequest<any[]>(`/guilds/${guildId}/ranks`),
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
  config: {
    get: (guildId: string) => apiRequest<any>(`/guilds/${guildId}/config`),
  },
  activity: {
    log: (guildId: string, data: any) => apiRequest<any>(`/guilds/${guildId}/activity`, { method: "POST", body: JSON.stringify(data) }),
  },
};
