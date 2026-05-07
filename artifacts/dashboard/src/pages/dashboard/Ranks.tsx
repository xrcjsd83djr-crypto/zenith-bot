import { useGuild } from "@/contexts/GuildContext";
import {
  useListRanks, useCreateRank, useDeleteRank,
  useListDivisions, useCreateDivision, useDeleteDivision,
  getListRanksQueryKey, getListDivisionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Shield, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function RanksPage() {
  const { selectedGuildId } = useGuild();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRankName, setNewRankName] = useState("");
  const [newRankPosition, setNewRankPosition] = useState("0");
  const [newDivisionName, setNewDivisionName] = useState("");

  const { data: ranks, isLoading: isLoadingRanks } = useListRanks(selectedGuildId || "", {
    query: { queryKey: getListRanksQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId },
  });

  const { data: divisions, isLoading: isLoadingDivisions } = useListDivisions(selectedGuildId || "", {
    query: { queryKey: getListDivisionsQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId },
  });

  const createRank = useCreateRank();
  const deleteRank = useDeleteRank();
  const createDivision = useCreateDivision();
  const deleteDivision = useDeleteDivision();

  const handleCreateRank = () => {
    if (!newRankName.trim()) return;
    createRank.mutate({
      guildId: selectedGuildId || "",
      data: { name: newRankName, position: parseInt(newRankPosition) || 0 },
    }, {
      onSuccess: () => {
        setNewRankName("");
        setNewRankPosition("0");
        queryClient.invalidateQueries({ queryKey: getListRanksQueryKey(selectedGuildId!) });
        toast({ title: "Rank created" });
      },
    });
  };

  const handleDeleteRank = (rankId: string) => {
    deleteRank.mutate({ guildId: selectedGuildId || "", rankId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRanksQueryKey(selectedGuildId!) });
        toast({ title: "Rank deleted" });
      },
    });
  };

  const handleCreateDivision = () => {
    if (!newDivisionName.trim()) return;
    createDivision.mutate({
      guildId: selectedGuildId || "",
      data: { name: newDivisionName },
    }, {
      onSuccess: () => {
        setNewDivisionName("");
        queryClient.invalidateQueries({ queryKey: getListDivisionsQueryKey(selectedGuildId!) });
        toast({ title: "Division created" });
      },
    });
  };

  const handleDeleteDivision = (divisionId: string) => {
    deleteDivision.mutate({ guildId: selectedGuildId || "", divisionId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDivisionsQueryKey(selectedGuildId!) });
        toast({ title: "Division deleted" });
      },
    });
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ranks & Divisions</h1>
        <p className="text-muted-foreground">Define your server hierarchy and organizational units.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Ranks</CardTitle>
            </div>
            <CardDescription>Configure the hierarchy of your staff team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Input
                placeholder="Rank Name (e.g. Moderator)"
                className="flex-1 bg-background/50"
                value={newRankName}
                onChange={(e) => setNewRankName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateRank()}
              />
              <Input
                type="number"
                placeholder="Position"
                className="w-24 bg-background/50"
                value={newRankPosition}
                onChange={(e) => setNewRankPosition(e.target.value)}
              />
              <Button onClick={handleCreateRank} disabled={createRank.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRanks ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-4">Loading...</TableCell></TableRow>
                  ) : !ranks || ranks.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No ranks defined.</TableCell></TableRow>
                  ) : ranks.slice().sort((a, b) => (b.position ?? 0) - (a.position ?? 0)).map((rank) => (
                    <TableRow key={rank.id}>
                      <TableCell className="font-medium">{rank.name}</TableCell>
                      <TableCell className="text-muted-foreground">{rank.position ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRank(rank.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Divisions</CardTitle>
            </div>
            <CardDescription>Create specialized units or departments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Input
                placeholder="Division Name (e.g. Internal Affairs)"
                className="flex-1 bg-background/50"
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateDivision()}
              />
              <Button onClick={handleCreateDivision} disabled={createDivision.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Division Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDivisions ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-4">Loading...</TableCell></TableRow>
                  ) : !divisions || divisions.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No divisions defined.</TableCell></TableRow>
                  ) : divisions.map((division) => (
                    <TableRow key={division.id}>
                      <TableCell className="font-medium">{division.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDivision(division.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
