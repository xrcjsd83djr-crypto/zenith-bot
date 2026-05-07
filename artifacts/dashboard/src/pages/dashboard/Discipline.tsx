import { useGuild } from "@/contexts/GuildContext";
import {
  useListStrikes, useListLoas, useApproveLoa, useDenyLoa, useRemoveStrike,
  getListStrikesQueryKey, getListLoasQueryKey,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock, Check, X, Trash2, AlertTriangle, AlertCircle, Skull } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function DisciplinePage() {
  const { selectedGuildId } = useGuild();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: strikes, isLoading: isLoadingStrikes } = useListStrikes(
    selectedGuildId || "",
    { active: true },
    { query: { queryKey: getListStrikesQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId } },
  );

  const { data: loas, isLoading: isLoadingLoas } = useListLoas(
    selectedGuildId || "",
    {},
    { query: { queryKey: getListLoasQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId } },
  );

  const approveLoa = useApproveLoa();
  const denyLoa = useDenyLoa();
  const removeStrike = useRemoveStrike();

  const handleLoaAction = (loaId: string, action: "approve" | "deny") => {
    const mutation = action === "approve" ? approveLoa : denyLoa;
    mutation.mutate({
      guildId: selectedGuildId || "",
      loaId,
      data: { reviewerId: "web-reviewer", reviewerUsername: "Dashboard" },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLoasQueryKey(selectedGuildId!) });
        toast({ title: `LOA ${action}d` });
      },
    });
  };

  const handleRemoveStrike = (strikeId: string) => {
    removeStrike.mutate({
      guildId: selectedGuildId || "",
      strikeId,
      data: { removedById: "web-reviewer" },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStrikesQueryKey(selectedGuildId!) });
        toast({ title: "Strike removed" });
      },
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "warning":
        return <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/5"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>;
      case "strike":
        return <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/5"><AlertCircle className="w-3 h-3 mr-1" /> Strike</Badge>;
      case "final_warning":
        return <Badge variant="outline" className="border-red-700/50 text-red-700 bg-red-700/5"><Skull className="w-3 h-3 mr-1" /> Final Warning</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getLoaStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="capitalize bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">Approved</Badge>;
      case "denied": return <Badge variant="destructive" className="capitalize">Denied</Badge>;
      default: return <Badge variant="outline" className="capitalize">Pending</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Discipline & LOA</h1>
        <p className="text-muted-foreground">Manage staff strikes and leave of absence requests.</p>
      </div>

      <Tabs defaultValue="strikes" className="w-full">
        <TabsList className="bg-muted/50 border border-border/50 p-1 mb-8">
          <TabsTrigger value="strikes" className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Recent Strikes
          </TabsTrigger>
          <TabsTrigger value="loas" className="flex items-center gap-2">
            <Clock className="w-4 h-4" /> LOA Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strikes" className="mt-0">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Strike History</CardTitle>
              <CardDescription>A record of all disciplinary actions taken against staff.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingStrikes ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10">Loading strikes...</TableCell></TableRow>
                  ) : !strikes || strikes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No strikes found.</TableCell></TableRow>
                  ) : strikes.map((strike) => (
                    <TableRow key={strike.id}>
                      <TableCell className="font-medium font-mono text-xs">{strike.staffId.slice(0, 8)}…</TableCell>
                      <TableCell>{getSeverityBadge(strike.severity)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={strike.reason}>{strike.reason}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{strike.issuedByUsername}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(strike.issuedAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {strike.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveStrike(strike.id)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loas" className="mt-0">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Leave of Absence Requests</CardTitle>
              <CardDescription>Manage staff time-off requests and approvals.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLoas ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10">Loading LOAs...</TableCell></TableRow>
                  ) : !loas || loas.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No LOA requests found.</TableCell></TableRow>
                  ) : loas.map((loa) => (
                    <TableRow key={loa.id}>
                      <TableCell className="font-medium font-mono text-xs">{loa.staffId.slice(0, 8)}…</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={loa.reason}>{loa.reason}</TableCell>
                      <TableCell>{getLoaStatusBadge(loa.status)}</TableCell>
                      <TableCell className="text-right">
                        {loa.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleLoaAction(loa.id, "deny")}>
                              <X className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-green-500" onClick={() => handleLoaAction(loa.id, "approve")}>
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
