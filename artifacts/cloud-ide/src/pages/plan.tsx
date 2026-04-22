import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Pencil,
  Play,
  Clock,
  Loader2,
  ChevronRight,
  History,
  Sparkles,
  Layers,
  Database,
  Globe,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
} from "lucide-react";

type StepStatus = "pending" | "approved" | "rejected" | "in-progress" | "done";

interface PlanStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  category: string;
}

interface PlanHistory {
  id: string;
  prompt: string;
  timestamp: string;
  stepCount: number;
}

const statusConfig: Record<StepStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Clock },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  "in-progress": { label: "In Progress", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Loader2 },
  done: { label: "Done", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

const demoSteps: PlanStep[] = [
  { id: "1", title: "Initialize project structure", description: "Set up monorepo with pnpm workspaces, TypeScript config, and base packages.", status: "done", category: "Setup" },
  { id: "2", title: "Design database schema", description: "Create PostgreSQL schema for users, projects, deployments, and collaboration sessions.", status: "done", category: "Backend" },
  { id: "3", title: "Build authentication layer", description: "Integrate Clerk for user auth with SSO, MFA, and role-based access control.", status: "approved", category: "Auth" },
  { id: "4", title: "Create REST API endpoints", description: "Implement Express API routes for CRUD operations on projects, files, and deployments.", status: "in-progress", category: "Backend" },
  { id: "5", title: "Build real-time collaboration", description: "Set up WebSocket server with CRDT-based conflict resolution for multiplayer editing.", status: "pending", category: "Collaboration" },
  { id: "6", title: "Implement CI/CD pipeline", description: "Configure build, test, and deploy automation with rollback support.", status: "pending", category: "DevOps" },
  { id: "7", title: "Add monitoring & observability", description: "Integrate error tracking, performance monitoring, and structured logging.", status: "pending", category: "Infrastructure" },
  { id: "8", title: "Security hardening", description: "Apply OWASP best practices, CSP headers, rate limiting, and input sanitization.", status: "pending", category: "Security" },
];

const demoHistory: PlanHistory[] = [
  { id: "h1", prompt: "Build a cloud IDE with real-time collaboration", timestamp: "2 hours ago", stepCount: 8 },
  { id: "h2", prompt: "Add payment integration with Stripe", timestamp: "Yesterday", stepCount: 5 },
  { id: "h3", prompt: "Create admin dashboard with analytics", timestamp: "3 days ago", stepCount: 6 },
];

const categoryIcons: Record<string, typeof Brain> = {
  Setup: Layers,
  Backend: Database,
  Auth: Shield,
  Collaboration: Globe,
  DevOps: Play,
  Infrastructure: Globe,
  Security: Shield,
};

export default function PlanModePage() {
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<PlanStep[]>(demoSteps);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const completedCount = steps.filter((s) => s.status === "done" || s.status === "approved").length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const updateStepStatus = (id: string, status: StepStatus) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setPrompt("");
    }, 1500);
  };

  return (
    <FeaturePageLayout title="Plan Mode" subtitle="AI-powered project planning with step-by-step architecture breakdown" badge="AI Planning" testId="plan-page">
      <div className="flex gap-6">
        <div className={`flex-1 space-y-6 ${sidebarOpen ? "" : ""}`}>
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                  <Input
                    placeholder="Describe what you want to build..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    className="pl-10 bg-background/50 border-border/50"
                  />
                </div>
                <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isGenerating ? "Generating..." : "Generate Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Architecture Overview
                </CardTitle>
                <Badge variant="outline" className="text-xs">{steps.length} steps</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Completed", value: steps.filter((s) => s.status === "done").length, color: "text-emerald-400" },
                  { label: "Approved", value: steps.filter((s) => s.status === "approved").length, color: "text-green-400" },
                  { label: "In Progress", value: steps.filter((s) => s.status === "in-progress").length, color: "text-blue-400" },
                  { label: "Pending", value: steps.filter((s) => s.status === "pending").length, color: "text-gray-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-background/50 rounded-lg p-3 border border-border/30">
                    <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Execution Progress</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {steps.map((step, index) => {
              const StatusIcon = statusConfig[step.status].icon;
              const CategoryIcon = categoryIcons[step.category] || Layers;
              return (
                <Card key={step.id} className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/20 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{step.title}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${statusConfig[step.status].color}`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${step.status === "in-progress" ? "animate-spin" : ""}`} />
                            {statusConfig[step.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        <div className="flex items-center gap-1.5 mt-3">
                          {step.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => updateStepStatus(step.id, "approved")}>
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => updateStepStatus(step.id, "rejected")}>
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => updateStepStatus(step.id, "in-progress")}>
                                <Play className="w-3 h-3" /> Start
                              </Button>
                            </>
                          )}
                          {step.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => updateStepStatus(step.id, "in-progress")}>
                              <Play className="w-3 h-3" /> Execute
                            </Button>
                          )}
                          {step.status === "in-progress" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => updateStepStatus(step.id, "done")}>
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </Button>
                          )}
                          {step.status === "rejected" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-gray-400 border-gray-500/30 hover:bg-gray-500/10" onClick={() => updateStepStatus(step.id, "pending")}>
                              <Pencil className="w-3 h-3" /> Revise
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground">
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className={`transition-all duration-300 ${sidebarOpen ? "w-72" : "w-10"}`}>
          <div className="sticky top-20">
            <Button variant="ghost" size="icon" className="mb-3" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </Button>
            {sidebarOpen && (
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Plan History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {demoHistory.map((h) => (
                    <button key={h.id} className="w-full text-left p-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/20 transition-colors">
                      <p className="text-sm font-medium truncate">{h.prompt}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{h.timestamp}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{h.stepCount} steps</Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </FeaturePageLayout>
  );
}
