import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ProjectPage from "@/pages/project";
import ExplorePage from "@/pages/explore";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import PricingPage from "@/pages/pricing";
import ChangelogPage from "@/pages/changelog";
import StatusPage from "@/pages/status";
import ApiDocsPage from "@/pages/api-docs";
import IntegrationsPage from "@/pages/integrations";
import ProfilePage from "@/pages/profile";
import SnippetsPage from "@/pages/snippets";
import LiveSessionPage from "@/pages/live-session";
import DeveloperSettingsPage from "@/pages/developer-settings";
import OrgSettingsPage from "@/pages/org-settings";
import TransferPage from "@/pages/transfer";
import WikiPageView from "@/pages/wiki";
import IncidentsPageView from "@/pages/incidents";
import ErrorDashboard from "@/pages/error-dashboard";
import CompliancePage from "@/pages/compliance";
import FunnelDashboard from "@/pages/funnel-dashboard";
import RevenueAnalytics from "@/pages/RevenueAnalytics";
import ImageRegistry from "@/pages/ImageRegistry";
import CodeMetrics from "@/pages/CodeMetrics";
import ContainerHealth from "@/pages/ContainerHealth";
import AdminRevenue from "@/pages/AdminRevenue";
import TeamsPage from "@/pages/teams";
import BillingDashboard from "@/pages/billing";
import DomainsPage from "@/pages/domains";
import SecurityPage from "@/pages/security";
import WebhooksPage from "@/pages/webhooks";
import OnboardingPage from "@/pages/onboarding";
import SupportPage from "@/pages/support";
import ImportProjectPage from "@/pages/import-project";
import LiveSharePage from "@/pages/live-share";
import TemplateStorePage from "@/pages/template-store";
import ErrorTrackingPage from "@/pages/error-tracking";
import NotFound from "@/pages/not-found";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import ErrorBoundary from "@/components/ErrorBoundary";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/login" component={LoginPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/forgot-password" component={ForgotPasswordPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard">
              <ProtectedRoute component={DashboardPage} />
            </Route>
            <Route path="/project/:id">
              {(params) => (
                <Show when="signed-in">
                  <ProjectPage id={params.id} />
                </Show>
              )}
            </Route>
            <Route path="/explore" component={ExplorePage} />
            <Route path="/pricing" component={PricingPage} />
            <Route path="/settings">
              <ProtectedRoute component={SettingsPage} />
            </Route>
            <Route path="/admin">
              <ProtectedRoute component={AdminPage} />
            </Route>
            <Route path="/changelog" component={ChangelogPage} />
            <Route path="/status" component={StatusPage} />
            <Route path="/api-docs" component={ApiDocsPage} />
            <Route path="/integrations">
              <ProtectedRoute component={IntegrationsPage} />
            </Route>
            <Route path="/billing">
              <ProtectedRoute component={BillingDashboard} />
            </Route>
            <Route path="/domains">
              <ProtectedRoute component={DomainsPage} />
            </Route>
            <Route path="/security">
              <ProtectedRoute component={SecurityPage} />
            </Route>
            <Route path="/profile/:username?" component={ProfilePage} />
            <Route path="/snippets" component={SnippetsPage} />
            <Route path="/developer">
              <ProtectedRoute component={DeveloperSettingsPage} />
            </Route>
            <Route path="/org/:orgId/{*rest}">
              <ProtectedRoute component={OrgSettingsPage} />
            </Route>
            <Route path="/org/:orgId">
              <ProtectedRoute component={OrgSettingsPage} />
            </Route>
            <Route path="/live/:shareCode">
              {(params) => (
                <Show when="signed-in">
                  <LiveSessionPage shareCode={params.shareCode} />
                </Show>
              )}
            </Route>
            <Route path="/transfer/:transferId/:action" component={TransferPage} />
            <Route path="/wiki/:projectId">
              <ProtectedRoute component={WikiPageView} />
            </Route>
            <Route path="/incidents">
              <ProtectedRoute component={IncidentsPageView} />
            </Route>
            <Route path="/errors">
              <ProtectedRoute component={ErrorDashboard} />
            </Route>
            <Route path="/compliance">
              <ProtectedRoute component={CompliancePage} />
            </Route>
            <Route path="/funnel">
              <ProtectedRoute component={FunnelDashboard} />
            </Route>
            <Route path="/revenue">
              <ProtectedRoute component={RevenueAnalytics} />
            </Route>
            <Route path="/registry">
              <ProtectedRoute component={ImageRegistry} />
            </Route>
            <Route path="/code-metrics">
              <ProtectedRoute component={CodeMetrics} />
            </Route>
            <Route path="/container-health">
              <ProtectedRoute component={ContainerHealth} />
            </Route>
            <Route path="/admin/revenue">
              <ProtectedRoute component={AdminRevenue} />
            </Route>
            <Route path="/teams">
              <ProtectedRoute component={TeamsPage} />
            </Route>
            <Route path="/webhooks">
              <ProtectedRoute component={WebhooksPage} />
            </Route>
            <Route path="/onboarding">
              <ProtectedRoute component={OnboardingPage} />
            </Route>
            <Route path="/support">
              <ProtectedRoute component={SupportPage} />
            </Route>
            <Route path="/import">
              <ProtectedRoute component={ImportProjectPage} />
            </Route>
            <Route path="/live-share">
              <ProtectedRoute component={LiveSharePage} />
            </Route>
            <Route path="/templates">
              <ProtectedRoute component={TemplateStorePage} />
            </Route>
            <Route path="/error-tracking">
              <ProtectedRoute component={ErrorTrackingPage} />
            </Route>
            <Route component={NotFound} />
          </Switch>
          <ProjectSwitcher />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
