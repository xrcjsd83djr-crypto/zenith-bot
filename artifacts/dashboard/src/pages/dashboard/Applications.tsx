import { useState } from "react";
import { useGuild } from "@/contexts/GuildContext";
import {
  useListApplications, useAcceptApplication, useDenyApplication,
  useListApplicationQuestions, useCreateApplicationQuestion, useDeleteApplicationQuestion,
  getListApplicationsQueryKey, getListApplicationQuestionsQueryKey,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Check, X, ClipboardList, Settings, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function ApplicationsPage() {
  const { selectedGuildId } = useGuild();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newQuestion, setNewQuestion] = useState("");

  const { data: apps, isLoading: isLoadingApps } = useListApplications(
    selectedGuildId || "",
    {},
    { query: { queryKey: getListApplicationsQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId } },
  );

  const { data: questions, isLoading: isLoadingQuestions } = useListApplicationQuestions(selectedGuildId || "", {
    query: { queryKey: getListApplicationQuestionsQueryKey(selectedGuildId || ""), enabled: !!selectedGuildId },
  });

  const acceptApp = useAcceptApplication();
  const denyApp = useDenyApplication();
  const createQuestion = useCreateApplicationQuestion();
  const deleteQuestion = useDeleteApplicationQuestion();

  const handleAction = (appId: string, action: "accept" | "deny") => {
    const mutation = action === "accept" ? acceptApp : denyApp;
    mutation.mutate({
      guildId: selectedGuildId || "",
      applicationId: appId,
      data: {},
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey(selectedGuildId!) });
        toast({ title: `Application ${action}ed` });
      },
    });
  };

  const handleCreateQuestion = () => {
    if (!newQuestion.trim()) return;
    createQuestion.mutate({
      guildId: selectedGuildId || "",
      data: { question: newQuestion, isRequired: true },
    }, {
      onSuccess: () => {
        setNewQuestion("");
        queryClient.invalidateQueries({ queryKey: getListApplicationQuestionsQueryKey(selectedGuildId!) });
        toast({ title: "Question added" });
      },
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    deleteQuestion.mutate({ guildId: selectedGuildId || "", questionId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApplicationQuestionsQueryKey(selectedGuildId!) });
        toast({ title: "Question deleted" });
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted": return <Badge className="capitalize bg-green-500/10 text-green-500 border-green-500/20">Accepted</Badge>;
      case "denied": return <Badge variant="destructive" className="capitalize">Denied</Badge>;
      default: return <Badge variant="outline" className="capitalize">Pending</Badge>;
    }
  };

  const renderAppCards = (status: "pending" | "accepted" | "denied") => {
    const filteredApps = apps?.applications.filter((a) => a.status === status) || [];

    if (isLoadingApps) return <div className="text-center py-10">Loading applications...</div>;
    if (filteredApps.length === 0) return <div className="text-center py-10 text-muted-foreground">No {status} applications.</div>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredApps.map((app) => (
          <Card key={app.id} className="bg-card/50 border-border/50 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <CardTitle className="text-lg">{app.applicantUsername}</CardTitle>
                  <CardDescription>ID: {app.applicantDiscordId}</CardDescription>
                </div>
                {getStatusBadge(status)}
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted {format(new Date(app.submittedAt), "MMM d, h:mm a")}
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              {app.answers && (app.answers as any[]).length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="answers" className="border-none">
                    <AccordionTrigger className="text-sm py-2 hover:no-underline bg-muted/30 px-3 rounded-md">View Answers</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4 px-1">
                      {(app.answers as any[]).map((ans: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{ans.question || `Question ${i + 1}`}</p>
                          <p className="text-sm leading-relaxed">{ans.answer}</p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
            {status === "pending" && (
              <CardFooter className="pt-3 gap-3 border-t border-border/50 mt-auto">
                <Button variant="outline" className="flex-1 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50" onClick={() => handleAction(app.id, "deny")}>
                  <X className="w-4 h-4 mr-2" /> Deny
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(app.id, "accept")}>
                  <Check className="w-4 h-4 mr-2" /> Accept
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">Review staff applications and manage hiring questions.</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-muted/50 border border-border/50 p-1 mb-8">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Pending
          </TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
          <TabsTrigger value="configure" className="flex items-center gap-2 ml-auto">
            <Settings className="w-4 h-4" /> Configure Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0">{renderAppCards("pending")}</TabsContent>
        <TabsContent value="accepted" className="mt-0">{renderAppCards("accepted")}</TabsContent>
        <TabsContent value="denied" className="mt-0">{renderAppCards("denied")}</TabsContent>

        <TabsContent value="configure" className="mt-0">
          <Card className="bg-card/50 border-border/50 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Application Questions</CardTitle>
              <CardDescription>These questions will be asked to all applicants via the Discord modal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter a question..."
                  className="bg-background/50"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateQuestion()}
                />
                <Button onClick={handleCreateQuestion} disabled={createQuestion.isPending}>
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>

              <div className="space-y-3">
                {isLoadingQuestions ? (
                  <div className="text-center py-4">Loading questions...</div>
                ) : !questions || questions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground italic">No questions added yet. Add up to 5 questions for the application modal.</div>
                ) : questions.map((q, i) => (
                  <div key={q.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 group">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <span className="text-sm">{q.question}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteQuestion(q.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
