import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useGuild } from "@/contexts/GuildContext";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, Trophy, ClipboardList, ShieldAlert, Settings, LogOut, Crown } from "lucide-react";
import { Link } from "wouter";
import { useLogout } from "@workspace/api-client-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, guilds, selectedGuildId, setSelectedGuildId, isLoadingUser, selectedGuild } = useGuild();
  const [, setLocation] = useLocation();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoadingUser && !user) {
      setLocation("/");
    }
  }, [user, isLoadingUser, setLocation]);

  if (isLoadingUser || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Users, label: "Staff Team", href: "/dashboard/staff" },
    { icon: Trophy, label: "Ranks & Divisions", href: "/dashboard/ranks" },
    { icon: ClipboardList, label: "Applications", href: "/dashboard/applications" },
    { icon: ShieldAlert, label: "Discipline & LOA", href: "/dashboard/discipline" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                Z
              </div>
              <span className="font-bold text-xl tracking-tight">Zenith</span>
            </div>

            <Select value={selectedGuildId || ""} onValueChange={setSelectedGuildId}>
              <SelectTrigger className="w-full bg-muted/50 border-none">
                <SelectValue placeholder="Select Server" />
              </SelectTrigger>
              <SelectContent>
                {guilds?.map((guild) => (
                  <SelectItem key={guild.id} value={guild.id}>
                    <div className="flex items-center gap-2">
                      {guild.icon ? (
                        <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                          {guild.name.charAt(0)}
                        </div>
                      )}
                      <span className="truncate">{guild.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild>
                        <Link href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground">
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 mt-auto">
            {selectedGuild?.isSetup && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <Crown className="w-5 h-5 text-amber-500" />
                <div className="text-xs">
                  <p className="font-bold text-amber-500">Premium Active</p>
                  <p className="text-muted-foreground">Server benefits unlocked</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-9 w-9 border border-border">
                {user.avatar ? (
                  <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} />
                ) : (
                  <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">Staff Member</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
