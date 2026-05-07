import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuildProvider } from "@/contexts/GuildContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LandingPage from "@/pages/LandingPage";
import DashboardOverview from "@/pages/dashboard/Overview";
import StaffPage from "@/pages/dashboard/Staff";
import RanksPage from "@/pages/dashboard/Ranks";
import ApplicationsPage from "@/pages/dashboard/Applications";
import DisciplinePage from "@/pages/dashboard/Discipline";
import SettingsPage from "@/pages/dashboard/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      {/* Dashboard Routes wrapped in Layout */}
      <Route path="/dashboard">
        <DashboardLayout>
          <DashboardOverview />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/staff">
        <DashboardLayout>
          <StaffPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/ranks">
        <DashboardLayout>
          <RanksPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/applications">
        <DashboardLayout>
          <ApplicationsPage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/discipline">
        <DashboardLayout>
          <DisciplinePage />
        </DashboardLayout>
      </Route>
      <Route path="/dashboard/settings">
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GuildProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </GuildProvider>
    </QueryClientProvider>
  );
}

export default App;
