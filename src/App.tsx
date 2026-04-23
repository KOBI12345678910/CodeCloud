import { useEffect } from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuthStore } from "@/stores/auth-store";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import DashboardPage from "@/pages/dashboard";
import MarketplacePage from "@/pages/marketplace";
import AIBuilderPage from "@/pages/ai";
import SettingsPage from "@/pages/settings";
import AnalyticsPage from "@/pages/analytics";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

export default function App() {
  const { restoreSession } = useAuthStore();

  useEffect(() => { restoreSession(); }, []);

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">{() => <ProtectedRoute component={DashboardPage} />}</Route>
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/ai">{() => <ProtectedRoute component={AIBuilderPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>
      <Route path="/analytics">{() => <ProtectedRoute component={AnalyticsPage} />}</Route>
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4">404</h1>
            <p className="text-slate-400 mb-6">×××£ ×× × ××¦×</p>
            <a href="/" className="text-blue-400 hover:text-blue-300">×××¨× ×××£ ××××ª</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
