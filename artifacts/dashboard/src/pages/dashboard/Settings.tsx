import { useGuild } from "@/contexts/GuildContext";
import { useGetGuild, useUpdateGuild, getGetGuildQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Settings, Bell, Palette, Shield, Crown, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const guildSettingsSchema = z.object({
  staffRoleId: z.string().optional(),
  managementRoleId: z.string().optional(),
  logChannelId: z.string().optional(),
  applicationChannelId: z.string().optional(),
  applicationReviewChannelId: z.string().optional(),
  welcomeChannelId: z.string().optional(),
  embedColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color").optional(),
  embedFooter: z.string().optional(),
});

export default function SettingsPage() {
  const { selectedGuildId, selectedGuild: discordGuild } = useGuild();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guild, isLoading } = useGetGuild(selectedGuildId || "", {
    query: { queryKey: getGetGuildQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId },
  });

  const updateGuild = useUpdateGuild();

  const form = useForm<z.infer<typeof guildSettingsSchema>>({
    resolver: zodResolver(guildSettingsSchema),
    defaultValues: {
      staffRoleId: "",
      managementRoleId: "",
      logChannelId: "",
      applicationChannelId: "",
      applicationReviewChannelId: "",
      welcomeChannelId: "",
      embedColor: "#5865F2",
      embedFooter: "Zenith Staff Management",
    },
  });

  useEffect(() => {
    if (guild) {
      form.reset({
        staffRoleId: guild.staffRoleId ?? "",
        managementRoleId: guild.managementRoleId ?? "",
        logChannelId: guild.logChannelId ?? "",
        applicationChannelId: guild.applicationChannelId ?? "",
        applicationReviewChannelId: guild.applicationReviewChannelId ?? "",
        welcomeChannelId: guild.welcomeChannelId ?? "",
        embedColor: guild.embedColor || "#5865F2",
        embedFooter: guild.embedFooter ?? "Zenith Staff Management",
      });
    }
  }, [guild, form]);

  const onSubmit = (data: z.infer<typeof guildSettingsSchema>) => {
    updateGuild.mutate({
      guildId: selectedGuildId || "",
      data: {
        staffRoleId: data.staffRoleId || null,
        managementRoleId: data.managementRoleId || null,
        logChannelId: data.logChannelId || null,
        applicationChannelId: data.applicationChannelId || null,
        applicationReviewChannelId: data.applicationReviewChannelId || null,
        welcomeChannelId: data.welcomeChannelId || null,
        embedColor: data.embedColor,
        embedFooter: data.embedFooter || null,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGuildQueryKey(selectedGuildId!) });
        toast({ title: "Settings saved", description: "Guild configuration has been updated." });
      },
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading settings...</div>;

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Server Settings</h1>
        <p className="text-muted-foreground">Configure Zenith for {discordGuild?.name || "your server"}.</p>
      </div>

      {!guild?.isPremium && (
        <Card className="bg-amber-500/10 border-amber-500/20 shadow-lg shadow-amber-500/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                <Crown className="w-6 h-6 fill-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-amber-500">Premium Benefits</h3>
                <p className="text-sm text-muted-foreground">Upgrade to unlock activity logs, custom branding, and unlimited ranks.</p>
              </div>
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold" asChild>
              <a href="https://discord.gg/zenith" target="_blank" rel="noopener noreferrer">Upgrade Now</a>
            </Button>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-5 h-5 text-primary" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>Customize how Zenith looks in your Discord server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="embedColor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed Accent Color</FormLabel>
                  <div className="flex gap-4 items-center">
                    <FormControl>
                      <Input {...field} className="max-w-[200px] bg-background/50 font-mono" placeholder="#5865F2" />
                    </FormControl>
                    <div className="w-10 h-10 rounded-md border border-border" style={{ backgroundColor: field.value }} />
                  </div>
                  <FormDescription>The color used for Zenith's Discord embeds.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="embedFooter" render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed Footer Text</FormLabel>
                  <FormControl>
                    <Input {...field} className="max-w-sm bg-background/50" placeholder="Zenith Staff Management" />
                  </FormControl>
                  <FormDescription>Text shown at the bottom of all bot embeds.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle>Role Permissions</CardTitle>
              </div>
              <CardDescription>Assign roles for staff and management access.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="staffRoleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Role ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Role ID" className="bg-background/50 font-mono text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="managementRoleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Management Role ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Role ID" className="bg-background/50 font-mono text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-primary" />
                <CardTitle>Channel Configuration</CardTitle>
              </div>
              <CardDescription>Where Zenith should send logs and notifications.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="logChannelId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Logging Channel ID</FormLabel>
                  <FormControl><Input {...field} placeholder="Channel ID" className="bg-background/50 font-mono text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="applicationChannelId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Channel ID</FormLabel>
                  <FormControl><Input {...field} placeholder="Channel ID" className="bg-background/50 font-mono text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="applicationReviewChannelId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Channel ID</FormLabel>
                  <FormControl><Input {...field} placeholder="Channel ID" className="bg-background/50 font-mono text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="welcomeChannelId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome Channel ID</FormLabel>
                  <FormControl><Input {...field} placeholder="Channel ID" className="bg-background/50 font-mono text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end sticky bottom-8 pt-4">
            <Button type="submit" size="lg" disabled={updateGuild.isPending} className="px-8 shadow-xl shadow-primary/20">
              <Save className="w-4 h-4 mr-2" />
              {updateGuild.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
