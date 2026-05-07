import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGetMe, useGetUserGuilds, getGetMeQueryKey, getGetUserGuildsQueryKey } from "@workspace/api-client-react";
import type { DiscordUser, DiscordGuild } from "@workspace/api-client-react";

interface GuildContextType {
  selectedGuildId: string | null;
  setSelectedGuildId: (id: string | null) => void;
  user: DiscordUser | undefined;
  isLoadingUser: boolean;
  guilds: DiscordGuild[] | undefined;
  isLoadingGuilds: boolean;
  selectedGuild: DiscordGuild | undefined;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

export function GuildProvider({ children }: { children: ReactNode }) {
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(() => {
    return localStorage.getItem("selectedGuildId");
  });

  const { data: user, isLoading: isLoadingUser } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });

  const { data: guilds, isLoading: isLoadingGuilds } = useGetUserGuilds({
    query: { queryKey: getGetUserGuildsQueryKey(), enabled: !!user },
  });

  useEffect(() => {
    if (selectedGuildId) {
      localStorage.setItem("selectedGuildId", selectedGuildId);
    } else {
      localStorage.removeItem("selectedGuildId");
    }
  }, [selectedGuildId]);

  // Auto-select first guild if none selected
  useEffect(() => {
    if (guilds && guilds.length > 0 && !selectedGuildId) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [guilds, selectedGuildId]);

  const selectedGuild = guilds?.find(g => g.id === selectedGuildId);

  return (
    <GuildContext.Provider value={{
      selectedGuildId,
      setSelectedGuildId,
      user,
      isLoadingUser,
      guilds,
      isLoadingGuilds,
      selectedGuild
    }}>
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild() {
  const context = useContext(GuildContext);
  if (context === undefined) {
    throw new Error("useGuild must be used within a GuildProvider");
  }
  return context;
}
