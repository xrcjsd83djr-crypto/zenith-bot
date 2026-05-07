import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGuild } from "@/contexts/GuildContext";
import { useGetGuildStats, getGetGuildStatsQueryKey } from "@workspace/api-client-react";
import { Users, ClipboardList, ShieldAlert, Clock, Activity, Plus, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardOverview() {
  const { selectedGuildId } = useGuild();
  const { data: stats, isLoading } = useGetGuildStats(selectedGuildId || "", {
    query: {
      queryKey: getGetGuildStatsQueryKey(selectedGuildId || ""),
      enabled: !!selectedGuildId,
    },
  });

  const statCards = [
    { label: "Total Staff", value: stats?.totalStaff, icon: Users, color: "text-blue-500" },
    { label: "Active Staff", value: stats?.activeStaff, icon: Activity, color: "text-green-500" },
    { label: "Pending Apps", value: stats?.pendingApplications, icon: ClipboardList, color: "text-amber-500" },
    { label: "Active Strikes", value: stats?.activeStrikes, icon: ShieldAlert, color: "text-red-500" },
    { label: "Active LOAs", value: stats?.activeLoas, icon: Clock, color: "text-purple-500" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening in your server.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{stat.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all group" onClick={() => window.location.href = "/dashboard/staff"}>
                <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>Add Staff</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all group" onClick={() => window.location.href = "/dashboard/applications"}>
                <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>Applications</span>
              </Button>
              <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-destructive/10 hover:border-destructive/50 transition-all group" onClick={() => window.location.href = "/dashboard/discipline"}>
                <AlertTriangle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>Discipline</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{activity.description || activity.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()} • {activity.actorUsername}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Premium Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-amber-500" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="font-bold text-amber-500">Upgrade to Premium</h3>
                <p className="text-xs text-muted-foreground mt-2 mb-4">Unlock activity tracking, advanced analytics, and custom branding.</p>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold" asChild>
                  <a href="https://discord.gg/zenith" target="_blank" rel="noopener noreferrer">Buy Now</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
