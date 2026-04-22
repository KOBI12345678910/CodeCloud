import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Bot,
  MessageSquare,
  GitPullRequest,
  Shield,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Eye,
  Send,
  Loader2,
  Code2,
  MousePointer2,
  Circle,
  Activity,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  status: "active" | "idle" | "away";
  currentFile?: string;
  cursorLine?: number;
}

interface AIAgent {
  id: string;
  name: string;
  type: string;
  status: "working" | "idle" | "waiting";
  currentTask?: string;
}

interface ActivityEntry {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  color: string;
}

interface ChatMessage {
  id: string;
  user: string;
  color: string;
  text: string;
  timestamp: string;
  codeSnippet?: string;
  mentions?: string[];
}

interface DiffLine {
  type: "add" | "remove" | "context";
  lineNum: number;
  content: string;
}

const demoTeam: TeamMember[] = [
  { id: "u1", name: "Sarah Chen", avatar: "SC", color: "#3b82f6", status: "active", currentFile: "src/api/auth.ts", cursorLine: 42 },
  { id: "u2", name: "James Liu", avatar: "JL", color: "#8b5cf6", status: "active", currentFile: "src/components/Editor.tsx", cursorLine: 156 },
  { id: "u3", name: "Maya Patel", avatar: "MP", color: "#f59e0b", status: "idle", currentFile: "src/pages/dashboard.tsx", cursorLine: 89 },
  { id: "u4", name: "Alex Rivera", avatar: "AR", color: "#ef4444", status: "away" },
];

const demoAgents: AIAgent[] = [
  { id: "a1", name: "Code Assistant", type: "copilot", status: "working", currentTask: "Refactoring auth middleware" },
  { id: "a2", name: "Test Generator", type: "testing", status: "idle" },
  { id: "a3", name: "Review Bot", type: "review", status: "waiting", currentTask: "Reviewing PR #47" },
];

const demoActivity: ActivityEntry[] = [
  { id: "act1", user: "Sarah", action: "edited", target: "src/api/auth.ts", timestamp: "Just now", color: "#3b82f6" },
  { id: "act2", user: "Code Assistant", action: "suggested fix for", target: "auth middleware", timestamp: "1 min ago", color: "#10b981" },
  { id: "act3", user: "James", action: "committed to", target: "feature/editor-v2", timestamp: "3 min ago", color: "#8b5cf6" },
  { id: "act4", user: "Maya", action: "started reviewing", target: "PR #47", timestamp: "5 min ago", color: "#f59e0b" },
  { id: "act5", user: "Review Bot", action: "flagged issue in", target: "src/utils/crypto.ts", timestamp: "8 min ago", color: "#10b981" },
  { id: "act6", user: "Sarah", action: "deployed", target: "staging environment", timestamp: "12 min ago", color: "#3b82f6" },
];

const demoChat: ChatMessage[] = [
  { id: "m1", user: "Sarah", color: "#3b82f6", text: "I've updated the auth flow, can someone review?", timestamp: "10:42 AM" },
  { id: "m2", user: "James", color: "#8b5cf6", text: "Looking at it now. The token refresh logic looks good!", timestamp: "10:43 AM" },
  { id: "m3", user: "Maya", color: "#f59e0b", text: "Found a potential issue in the error handling:", timestamp: "10:45 AM", codeSnippet: `try {\n  await refreshToken();\n} catch (err) {\n  // Should redirect to login\n  console.error(err);\n}`, mentions: ["Sarah"] },
  { id: "m4", user: "Code Assistant", color: "#10b981", text: "I can fix that. Here's the updated error handler with redirect logic.", timestamp: "10:46 AM", codeSnippet: `try {\n  await refreshToken();\n} catch (err) {\n  clearSession();\n  redirect('/login');\n}` },
];

const demoDiff: DiffLine[] = [
  { type: "context", lineNum: 38, content: "export async function refreshAuth(req, res, next) {" },
  { type: "context", lineNum: 39, content: "  const token = req.cookies.session;" },
  { type: "remove", lineNum: 40, content: "  if (!token) return res.status(401).json({ error: 'Unauthorized' });" },
  { type: "add", lineNum: 40, content: "  if (!token) {" },
  { type: "add", lineNum: 41, content: "    clearSession(res);" },
  { type: "add", lineNum: 42, content: "    return res.redirect('/login');" },
  { type: "add", lineNum: 43, content: "  }" },
  { type: "context", lineNum: 44, content: "  try {" },
  { type: "context", lineNum: 45, content: "    const decoded = await verifyToken(token);" },
  { type: "remove", lineNum: 46, content: "    req.user = decoded;" },
  { type: "add", lineNum: 46, content: "    req.user = { ...decoded, refreshedAt: Date.now() };" },
  { type: "context", lineNum: 47, content: "    next();" },
  { type: "context", lineNum: 48, content: "  } catch (err) {" },
  { type: "remove", lineNum: 49, content: "    console.error(err);" },
  { type: "add", lineNum: 49, content: "    clearSession(res);" },
  { type: "add", lineNum: 50, content: "    return res.redirect('/login');" },
  { type: "context", lineNum: 51, content: "  }" },
  { type: "context", lineNum: 52, content: "}" },
];

const roles = ["Owner", "Admin", "Editor", "Viewer"];

export default function CollaboratePage() {
  const [chatInput, setChatInput] = useState("");
  const [videoOn, setVideoOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [followMode, setFollowMode] = useState<string | null>(null);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({ u1: "Owner", u2: "Admin", u3: "Editor", u4: "Viewer" });

  return (
    <FeaturePageLayout title="Multiplayer Collaboration" subtitle="Real-time team editing with AI agents, code review, and voice/video" badge="Collaboration" testId="collaborate-page">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {demoTeam.filter((m) => m.status === "active").map((m) => (
                <div key={m.id} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-background" style={{ backgroundColor: m.color }}>
                  {m.avatar}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{demoTeam.filter((m) => m.status === "active").length} active</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={micOn ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setMicOn(!micOn)}>
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            <Button variant={videoOn ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setVideoOn(!videoOn)}>
              {videoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            <Button variant={followMode ? "default" : "outline"} size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setFollowMode(followMode ? null : "u1")}>
              <Eye className="w-3.5 h-3.5" /> {followMode ? "Following Sarah" : "Follow Mode"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Team ({demoTeam.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {demoTeam.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-1.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: m.color }}>
                      {m.avatar}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${m.status === "active" ? "bg-green-400" : m.status === "idle" ? "bg-yellow-400" : "bg-gray-500"}`} />
                    {m.status === "active" && (
                      <MousePointer2 className="absolute -top-1 -right-2 w-3 h-3" style={{ color: m.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{m.name}</div>
                    {m.currentFile && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {m.currentFile}:{m.cursorLine}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[9px] capitalize ${m.status === "active" ? "text-green-400 border-green-500/30" : m.status === "idle" ? "text-yellow-400 border-yellow-500/30" : "text-gray-400 border-gray-500/30"}`}>
                    {m.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" /> AI Agents ({demoAgents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {demoAgents.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.name}</div>
                    {a.currentTask && <div className="text-[10px] text-muted-foreground truncate">{a.currentTask}</div>}
                  </div>
                  <Badge variant="outline" className={`text-[9px] capitalize ${a.status === "working" ? "text-blue-400 border-blue-500/30" : a.status === "waiting" ? "text-yellow-400 border-yellow-500/30" : "text-gray-400 border-gray-500/30"}`}>
                    {a.status === "working" && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
                    {a.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Live Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {demoActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-2 py-1">
                  <Circle className="w-2 h-2 mt-1.5 shrink-0" style={{ color: a.color, fill: a.color }} />
                  <div className="text-xs">
                    <span className="font-medium" style={{ color: a.color }}>{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    <span className="font-medium">{a.target}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground ml-auto whitespace-nowrap">{a.timestamp}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Team Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto mb-3">
                {demoChat.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: msg.color }}>{msg.user}</span>
                      <span className="text-[9px] text-muted-foreground">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-foreground/90">
                      {msg.mentions?.map((m) => (
                        <span key={m} className="text-primary font-medium">@{m} </span>
                      ))}
                      {msg.text}
                    </p>
                    {msg.codeSnippet && (
                      <div className="bg-black/40 rounded-md p-3 font-mono text-[11px] text-gray-300 border border-border/20 whitespace-pre">
                        {msg.codeSnippet}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message... (@ to mention)" className="text-xs bg-background/50" />
                <Button size="sm" className="h-9 w-9 p-0 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-primary" /> Code Review — PR #47
                </CardTitle>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] text-green-400 border-green-500/30">Approve</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] text-red-400 border-red-500/30">Request Changes</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-black/40 rounded-lg border border-border/20 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-border/20 text-[10px] text-muted-foreground flex items-center gap-2">
                  <Code2 className="w-3 h-3" />
                  src/api/auth.ts
                  <Badge variant="outline" className="text-[9px] ml-auto">+6 −3</Badge>
                </div>
                <div className="font-mono text-[11px] max-h-48 overflow-y-auto">
                  {demoDiff.map((line, i) => (
                    <div key={i} className={`px-3 py-0.5 flex ${line.type === "add" ? "bg-green-500/10 text-green-300" : line.type === "remove" ? "bg-red-500/10 text-red-300" : "text-gray-400"}`}>
                      <span className="w-8 text-right pr-2 text-muted-foreground/50 select-none shrink-0">{line.lineNum}</span>
                      <span className="w-4 text-center select-none shrink-0">{line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}</span>
                      <span className="whitespace-pre">{line.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {demoTeam.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-background/30 border border-border/20">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: m.color }}>
                    {m.avatar}
                  </div>
                  <span className="text-sm flex-1">{m.name}</span>
                  <select
                    value={memberRoles[m.id]}
                    onChange={(e) => setMemberRoles((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="bg-background border border-border rounded px-2 py-1 text-xs"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </FeaturePageLayout>
  );
}
