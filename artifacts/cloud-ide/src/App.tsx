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
import AdminI18nPage from "@/pages/admin-i18n";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import PricingPage from "@/pages/pricing";
import ChangelogPage from "@/pages/changelog";
import ProductPage from "@/pages/product";
import SolutionsPage from "@/pages/solutions";
import BlogPage from "@/pages/blog";
import CareersPage from "@/pages/careers";
import DocsPage from "@/pages/docs";
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
import TasksPage from "@/pages/tasks";
import DomainsPage from "@/pages/domains";
import SecurityPage from "@/pages/security";
import WebhooksPage from "@/pages/webhooks";
import OnboardingPage from "@/pages/onboarding";
import SupportPage from "@/pages/support";
import ImportProjectPage from "@/pages/import-project";
import LiveSharePage from "@/pages/live-share";
import TemplateStorePage from "@/pages/template-store";
import ErrorTrackingPage from "@/pages/error-tracking";
import { AboutPage, TermsPage, PrivacyPage } from "@/pages/marketing-stub";
import BuildHubPage from "@/pages/buildhub";
import BuildHubWorkspace from "@/pages/buildhub-workspace";
import BountiesPage from "@/pages/bounties";
import NotFound from "@/pages/not-found";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import ErrorBoundary from "@/components/ErrorBoundary";
import { I18nProvider } from "@/i18n";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function MissingClerkKeyScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-lg text-center space-y-4">
        <div className="text-5xl">🔐</div>
        <h1 className="text-2xl font-semibold">Authentication not configured</h1>
        <p className="text-muted-foreground text-sm">
          The app needs a Clerk publishable key to enable sign-in. Set
          <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs font-mono">VITE_CLERK_PUBLISHABLE_KEY</code>
          in your environment, then reload.
        </p>
        <p className="text-xs text-muted-foreground">
          You can still browse the rest of the app once the key is set.
        </p>
      </div>
    </div>
  );
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
  const [location] = useLocation();
  const redirectTarget = `/sign-in?redirect=${encodeURIComponent(location)}`;
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to={redirectTarget} />
      </Show>
    </>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6" data-testid="access-denied">
      <div className="max-w-md text-center">
        <div className="text-6xl font-bold text-primary mb-4">403</div>
        <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You don't have permission to view this page.</p>
        <a href={`${basePath}/`} className="inline-block px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition" data-testid="link-go-home">
          Go home
        </a>
      </div>
    </div>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useClerk();
  const [location] = useLocation();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin" || role === "owner";
  return (
    <>
      <Show when="signed-out">
        <Redirect to={`/sign-in?redirect=${encodeURIComponent(location)}`} />
      </Show>
      <Show when="signed-in">
        {isAdmin ? <Component /> : <AccessDenied />}
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

  if (!clerkPubKey) {
    return <MissingClerkKeyScreen />;
  }

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
            <Route path="/dashboard" component={DashboardPage} />
            <Route path="/project/:id">
              {(params) => (
                <Show when="signed-in">
                  <ProjectPage id={params.id} />
                </Show>
              )}
            </Route>
            <Route path="/workspace/:id">
              {(params) => <ProjectPage id={params.id} />}
            </Route>
            <Route path="/ide">
              <>
                <Show when="signed-in">
                  <ProjectPage id="ide" />
                </Show>
                <Show when="signed-out">
                  <Redirect to="/sign-in?redirect=/ide" />
                </Show>
              </>
            </Route>
            <Route path="/explore" component={ExplorePage} />
            <Route path="/pricing" component={PricingPage} />
            <Route path="/settings">
              <ProtectedRoute component={SettingsPage} />
            </Route>
            <Route path="/admin">
              <AdminRoute component={AdminPage} />
            </Route>
            <Route path="/admin/i18n">
              <AdminRoute component={AdminI18nPage} />
            </Route>
            <Route path="/contact"><Redirect to="/support" /></Route>
            <Route path="/project"><Redirect to="/dashboard" /></Route>
            <Route path="/deploy"><Redirect to="/docs" /></Route>
            <Route path="/changelog" component={ChangelogPage} />
            <Route path="/product" component={ProductPage} />
            <Route path="/solutions" component={SolutionsPage} />
            <Route path="/blog" component={BlogPage} />
            <Route path="/blog/:slug" component={BlogPage} />
            <Route path="/careers" component={CareersPage} />
            <Route path="/docs" component={DocsPage} />
            <Route path="/status" component={StatusPage} />
            <Route path="/api-docs" component={ApiDocsPage} />
            <Route path="/integrations">
              <ProtectedRoute component={IntegrationsPage} />
            </Route>
            <Route path="/billing">
              <ProtectedRoute component={BillingDashboard} />
            </Route>
            <Route path="/tasks">
              <ProtectedRoute component={TasksPage} />
            </Route>
            <Route path="/domains">
              <ProtectedRoute component={DomainsPage} />
            </Route>
            <Route path="/security">
              <ProtectedRoute component={SecurityPage} />
            </Route>
            <Route path="/profile/:username?">
              <Show when="signed-in">
                <ProfilePage />
              </Show>
            </Route>
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
            <Route path="/support" component={SupportPage} />
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
            <Route path="/bounties" component={BountiesPage} />
            <Route path="/bounties/:id" component={BountiesPage} />
            <Route path="/build" component={BuildHubPage} />
            <Route path="/build/:id">
              {(params) => <BuildHubWorkspace id={params.id} />}
            </Route>
            <Route path="/about" component={AboutPage} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/privacy" component={PrivacyPage} />
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
      <I18nProvider>
        <ThemeProvider>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
