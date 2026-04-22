import { useState } from "react";
import { Link } from "wouter";
import { Code2, ArrowLeft, ChevronDown, ChevronRight, Lock, Globe, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  description: string;
  auth: boolean;
  body?: string;
  response?: string;
}

interface EndpointGroup {
  name: string;
  endpoints: Endpoint[];
}

const apiGroups: EndpointGroup[] = [
  {
    name: "Authentication",
    endpoints: [
      { method: "POST", path: "/api/auth/register", description: "Register a new account", auth: false, body: '{ "email": "...", "password": "...", "username": "..." }', response: '{ "user": {...}, "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }' },
      { method: "POST", path: "/api/auth/login", description: "Login with email/password", auth: false, body: '{ "email": "...", "password": "..." }', response: '{ "user": {...}, "accessToken": "...", "refreshToken": "..." }' },
      { method: "POST", path: "/api/auth/refresh", description: "Refresh access token", auth: false, body: '{ "refreshToken": "..." }', response: '{ "accessToken": "...", "refreshToken": "..." }' },
      { method: "POST", path: "/api/auth/logout", description: "Logout and revoke tokens", auth: true },
      { method: "POST", path: "/api/auth/logout-all", description: "Revoke all sessions", auth: true },
      { method: "GET", path: "/api/auth/me", description: "Get current user info", auth: true },
      { method: "POST", path: "/api/auth/change-password", description: "Change password", auth: true, body: '{ "currentPassword": "...", "newPassword": "..." }' },
      { method: "GET", path: "/api/auth/google", description: "Get Google OAuth URL", auth: false },
      { method: "POST", path: "/api/auth/google/callback", description: "Google OAuth callback", auth: false, body: '{ "code": "..." }' },
    ],
  },
  {
    name: "Projects",
    endpoints: [
      { method: "GET", path: "/api/projects", description: "List user's projects", auth: true },
      { method: "POST", path: "/api/projects", description: "Create a new project", auth: true, body: '{ "name": "...", "language": "javascript", "templateId": "..." }' },
      { method: "GET", path: "/api/projects/:id", description: "Get project details", auth: true },
      { method: "PATCH", path: "/api/projects/:id", description: "Update project", auth: true },
      { method: "DELETE", path: "/api/projects/:id", description: "Delete project", auth: true },
      { method: "POST", path: "/api/projects/:id/fork", description: "Fork a project", auth: true },
      { method: "GET", path: "/api/projects/:id/export", description: "Export project as ZIP", auth: true },
    ],
  },
  {
    name: "Files",
    endpoints: [
      { method: "GET", path: "/api/projects/:id/files", description: "List project files", auth: true },
      { method: "POST", path: "/api/projects/:id/files", description: "Create file/folder", auth: true, body: '{ "name": "...", "path": "/...", "content": "..." }' },
      { method: "GET", path: "/api/projects/:projectId/files/:fileId", description: "Get file content", auth: true },
      { method: "PATCH", path: "/api/projects/:projectId/files/:fileId", description: "Update file", auth: true, body: '{ "content": "..." }' },
      { method: "DELETE", path: "/api/projects/:projectId/files/:fileId", description: "Delete file", auth: true },
      { method: "PATCH", path: "/api/projects/:projectId/files/:fileId/move", description: "Move/rename file", auth: true, body: '{ "newPath": "..." }' },
    ],
  },
  {
    name: "Code Formatting",
    endpoints: [
      { method: "POST", path: "/api/format", description: "Format code with Prettier", auth: true, body: '{ "code": "...", "language": "typescript" }' },
      { method: "GET", path: "/api/format/languages", description: "List supported languages", auth: false },
    ],
  },
  {
    name: "Collaboration",
    endpoints: [
      { method: "GET", path: "/api/projects/:id/collaborators", description: "List collaborators", auth: true },
      { method: "POST", path: "/api/projects/:id/collaborators", description: "Add collaborator", auth: true, body: '{ "email": "...", "role": "editor" }' },
      { method: "DELETE", path: "/api/projects/:projectId/collaborators/:userId", description: "Remove collaborator", auth: true },
    ],
  },
  {
    name: "Deployments",
    endpoints: [
      { method: "GET", path: "/api/projects/:id/deployments", description: "List deployments", auth: true },
      { method: "POST", path: "/api/projects/:id/deployments", description: "Create deployment", auth: true },
    ],
  },
  {
    name: "AI Assistant",
    endpoints: [
      { method: "GET", path: "/api/ai/conversations", description: "List AI conversations", auth: true },
      { method: "POST", path: "/api/ai/conversations", description: "Create conversation", auth: true, body: '{ "projectId": "...", "title": "..." }' },
      { method: "POST", path: "/api/ai/conversations/:id/messages", description: "Send message", auth: true, body: '{ "content": "...", "context": "..." }' },
    ],
  },
  {
    name: "Dashboard & Explore",
    endpoints: [
      { method: "GET", path: "/api/dashboard/stats", description: "Dashboard statistics", auth: true },
      { method: "GET", path: "/api/dashboard/recent-activity", description: "Recent activity", auth: true },
      { method: "GET", path: "/api/dashboard/language-breakdown", description: "Language stats", auth: true },
      { method: "GET", path: "/api/explore", description: "Browse public projects", auth: false },
      { method: "GET", path: "/api/templates", description: "List templates", auth: false },
    ],
  },
  {
    name: "User Settings",
    endpoints: [
      { method: "GET", path: "/api/profile", description: "Get user profile", auth: true },
      { method: "PATCH", path: "/api/profile", description: "Update profile", auth: true },
      { method: "GET", path: "/api/settings/api-keys", description: "List API keys", auth: true },
      { method: "POST", path: "/api/settings/api-keys", description: "Create API key", auth: true, body: '{ "name": "..." }' },
      { method: "DELETE", path: "/api/settings/api-keys/:id", description: "Delete API key", auth: true },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400",
  POST: "bg-blue-500/20 text-blue-400",
  PATCH: "bg-amber-500/20 text-amber-400",
  PUT: "bg-orange-500/20 text-orange-400",
  DELETE: "bg-red-500/20 text-red-400",
};

export default function ApiDocsPage() {
  const { toast } = useToast();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Authentication"]));
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="api-docs-page">
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight">CodeCloud</span>
            </Link>
            <span className="text-muted-foreground text-sm">API Documentation</span>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">API Reference</h1>
          <p className="text-muted-foreground mt-1">Complete REST API documentation for CodeCloud</p>
        </div>

        <Card className="bg-card/50 border-border/50 mb-8">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Base URL</p>
                <code className="text-sm font-mono text-primary">{window.location.origin}/api</code>
              </div>
              <div className="border-l border-border/30 pl-4">
                <p className="text-xs font-medium text-muted-foreground">Auth</p>
                <code className="text-sm font-mono text-muted-foreground">Authorization: Bearer &lt;token&gt;</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {apiGroups.map((group) => (
            <Card key={group.name} className="bg-card border-border/50 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
                onClick={() => toggleGroup(group.name)}
              >
                <div className="flex items-center gap-2">
                  {expandedGroups.has(group.name) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold text-sm">{group.name}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                    {group.endpoints.length}
                  </span>
                </div>
              </button>

              {expandedGroups.has(group.name) && (
                <div className="border-t border-border/20">
                  {group.endpoints.map((ep, i) => {
                    const key = `${ep.method}-${ep.path}`;
                    const isExpanded = expandedEndpoint === key;

                    return (
                      <div key={i} className="border-b border-border/10 last:border-0">
                        <button
                          className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-muted/10 text-left"
                          onClick={() => setExpandedEndpoint(isExpanded ? null : key)}
                        >
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${methodColors[ep.method]}`}>
                            {ep.method}
                          </span>
                          <code className="text-xs font-mono flex-1 text-muted-foreground">{ep.path}</code>
                          {ep.auth ? (
                            <Lock className="w-3 h-3 text-amber-500/60" />
                          ) : (
                            <Globe className="w-3 h-3 text-emerald-500/60" />
                          )}
                          <span className="text-xs text-muted-foreground">{ep.description}</span>
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-3 space-y-2">
                            {ep.body && (
                              <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Request Body</p>
                                <div className="relative">
                                  <pre className="bg-[#0d1117] rounded-lg p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                                    {ep.body}
                                  </pre>
                                  <button
                                    className="absolute top-1.5 right-1.5 p-1 rounded bg-muted/30 hover:bg-muted/50"
                                    onClick={() => { navigator.clipboard.writeText(ep.body!); toast({ title: "Copied" }); }}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                            {ep.response && (
                              <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Response</p>
                                <pre className="bg-[#0d1117] rounded-lg p-3 text-[11px] font-mono text-blue-400 overflow-x-auto">
                                  {ep.response}
                                </pre>
                              </div>
                            )}
                            {!ep.body && !ep.response && (
                              <p className="text-xs text-muted-foreground italic">No additional details</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
