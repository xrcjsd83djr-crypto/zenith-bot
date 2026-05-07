import { useState } from "react";
import { useGuild } from "@/contexts/GuildContext";
import {
  useListStaff, useListRanks, useListDivisions, useCreateStaff,
  getListStaffQueryKey, getListRanksQueryKey, getListDivisionsQueryKey,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Filter, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const staffSchema = z.object({
  discordId: z.string().min(1, "Discord User ID is required"),
  discordUsername: z.string().min(1, "Username is required"),
  rankId: z.string().min(1, "Rank is required"),
  divisionId: z.string().optional(),
  callsign: z.string().optional(),
});

export default function StaffPage() {
  const { selectedGuildId } = useGuild();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [rankFilter, setRankFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: staffResponse, isLoading: isLoadingStaff } = useListStaff(
    selectedGuildId || "",
    undefined,
    { query: { queryKey: getListStaffQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId } },
  );

  const { data: ranks } = useListRanks(selectedGuildId || "", {
    query: { queryKey: getListRanksQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId },
  });

  const { data: divisions } = useListDivisions(selectedGuildId || "", {
    query: { queryKey: getListDivisionsQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId },
  });

  const createStaff = useCreateStaff();

  const form = useForm<z.infer<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: { discordId: "", discordUsername: "", rankId: "", divisionId: "", callsign: "" },
  });

  const onSubmit = (data: z.infer<typeof staffSchema>) => {
    createStaff.mutate({
      guildId: selectedGuildId || "",
      data: {
        discordId: data.discordId,
        discordUsername: data.discordUsername,
        rankId: data.rankId,
        divisionId: data.divisionId || null,
        callsign: data.callsign || null,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Staff member added", description: "Successfully added new staff member to the roster." });
        setIsAddModalOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(selectedGuildId!) });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message || "Failed to add staff member.", variant: "destructive" });
      },
    });
  };

  const filteredStaff = staffResponse?.staff.filter((member) => {
    const matchesSearch =
      member.discordUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.callsign?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank = rankFilter === "all" || member.rankId === rankFilter;
    return matchesSearch && matchesRank;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Team</h1>
          <p className="text-muted-foreground">Manage your server's staff roster.</p>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="discordId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discord User ID</FormLabel>
                    <FormControl><Input placeholder="123456789012345678" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="discordUsername" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl><Input placeholder="JohnDoe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rankId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rank</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a rank" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ranks?.map((rank) => (
                          <SelectItem key={rank.id} value={rank.id}>{rank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="divisionId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Division (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a division" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {divisions?.map((div) => (
                          <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="callsign" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Callsign (Optional)</FormLabel>
                    <FormControl><Input placeholder="1A-01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createStaff.isPending} className="w-full">
                    {createStaff.isPending ? "Adding..." : "Add Staff Member"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="flex items-center gap-4 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                className="pl-9 bg-background/50 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={rankFilter} onValueChange={setRankFilter}>
              <SelectTrigger className="w-[180px] bg-background/50 border-none">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by Rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranks</SelectItem>
                {ranks?.map((rank) => (
                  <SelectItem key={rank.id} value={rank.id}>{rank.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[250px]">Staff Member</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Callsign</TableHead>
                  <TableHead>Strikes</TableHead>
                  <TableHead className="text-right">Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStaff ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10">Loading roster...</TableCell></TableRow>
                ) : filteredStaff?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No staff members found.</TableCell></TableRow>
                ) : filteredStaff?.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {member.discordUsername.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.discordUsername}</p>
                          <p className="text-xs text-muted-foreground">ID: {member.discordId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-semibold text-xs border-primary/20 bg-primary/5 text-primary">
                        {ranks?.find((r) => r.id === member.rankId)?.name || member.rankName || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.divisionId ? (
                        <Badge variant="secondary" className="text-xs font-medium">
                          {divisions?.find((d) => d.id === member.divisionId)?.name || member.divisionName || "Unknown"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{member.callsign || "N/A"}</code>
                    </TableCell>
                    <TableCell>
                      {member.strikeCount > 0 ? (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                          {member.strikeCount} Strike{member.strikeCount !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground opacity-50">None</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {format(new Date(member.joinedAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
