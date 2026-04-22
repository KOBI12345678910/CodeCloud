import { useState, useEffect, useCallback, useRef } from "react";
import {
  Radio, Users, MessageSquare, Send, Copy, Check,
  Eye, Edit3, Crown, Pause, Play, XCircle, Loader2,
  ChevronRight, FileCode, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface Session {
  id: string;
  projectId: string;
  hostId: string;
  title: string;
  description: string | null;
  shareCode: string;
  status: "active" | "paused" | "ended";
  maxParticipants: number;
  allowChat: boolean;
  defaultRole: string;
  activeFile: string | null;
  createdAt: string;
  endedAt: string | null;
  hostName: string | null;
}

interface Participant {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  userName: string | null;
}

interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string | null;
}

interface LiveSessionProps {
  shareCode: string;
}

const ROLE_ICONS: Record<string, typeof Eye> = {
  spectator: Eye,
  editor: Edit3,
  presenter: Crown,
};

const ROLE_COLORS: Record<string, string> = {
  spectator: "text-gray-400",
  editor: "text-blue-400",
  presenter: "text-yellow-400",
};

export default function LiveSession({ shareCode }: LiveSessionProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [myRole, setMyRole] = useState<string>("spectator");
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const apiUrl = import.meta.env.VITE_API_URL || "";

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/live/${shareCode}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      } else {
        toast({ title: "Session not found", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to load session", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [shareCode, apiUrl, toast]);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/live/${shareCode}/participants`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
      }
    } catch {}
  }, [shareCode, apiUrl]);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/live/${shareCode}/chat?limit=200`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  }, [shareCode, apiUrl]);

  const joinSession = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/live/${shareCode}/join`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMyRole(data.role);
        setJoined(true);
        fetchParticipants();
        fetchChat();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || "Failed to join", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to join session", variant: "destructive" });
    }
  }, [shareCode, apiUrl, toast, fetchParticipants, fetchChat]);

  const leaveSession = useCallback(async () => {
    try {
      await fetch(`${apiUrl}/api/live/${shareCode}/leave`, {
        method: "POST",
        credentials: "include",
      });
      setJoined(false);
    } catch {}
  }, [shareCode, apiUrl]);

  const sendChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput("");
    try {
      const res = await fetch(`${apiUrl}/api/live/${shareCode}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      }
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  }, [chatInput, shareCode, apiUrl, toast]);

  const updateSession = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await fetch(`${apiUrl}/api/live/${shareCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setSession(updated);
      }
    } catch {
      toast({ title: "Failed to update session", variant: "destructive" });
    }
  }, [shareCode, apiUrl, toast]);

  const changeRole = useCallback(async (participantId: string, role: string) => {
    try {
      await fetch(`${apiUrl}/api/live/${shareCode}/participants/${participantId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      fetchParticipants();
    } catch {
      toast({ title: "Failed to change role", variant: "destructive" });
    }
  }, [shareCode, apiUrl, toast, fetchParticipants]);

  const copyShareLink = () => {
    const url = `${window.location.origin}/live/${shareCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!joined) return;
    pollRef.current = setInterval(() => {
      fetchParticipants();
      fetchChat();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [joined, fetchParticipants, fetchChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { leaveSession(); };
  }, [leaveSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,11%)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,11%)] flex flex-col items-center justify-center text-gray-400">
        <Radio className="w-12 h-12 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold text-white mb-2">Session Not Found</h2>
        <p className="text-sm">This live session doesn't exist or has been removed.</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,11%)] flex flex-col items-center justify-center text-gray-400">
        <XCircle className="w-12 h-12 mb-4 text-red-400 opacity-50" />
        <h2 className="text-xl font-semibold text-white mb-2">Session Ended</h2>
        <p className="text-sm">This live coding session has ended.</p>
        <p className="text-xs mt-1">Hosted by {session.hostName || "Unknown"}</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,11%)] flex items-center justify-center">
        <div className="bg-[hsl(220,40%,13%)] border border-[hsl(215,20%,25%)] rounded-xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{session.title}</h2>
              <p className="text-xs text-gray-400">Hosted by {session.hostName || "Unknown"}</p>
            </div>
          </div>
          {session.description && (
            <p className="text-sm text-gray-400 mb-4">{session.description}</p>
          )}
          <div className="flex items-center gap-4 mb-6 text-xs text-gray-500">
            {session.status === "paused" && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                <Pause className="w-3 h-3 mr-1" /> Paused
              </Badge>
            )}
            {session.status === "active" && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                <Radio className="w-3 h-3 mr-1" /> Live
              </Badge>
            )}
            <span>Join as {session.defaultRole}</span>
          </div>
          <Button className="w-full" onClick={joinSession}>
            <Users className="w-4 h-4 mr-2" />
            Join Session
          </Button>
        </div>
      </div>
    );
  }

  const isHost = session.hostId === participants.find((p) => p.role === "presenter")?.userId;
  const activeParticipants = participants.filter((p) => !p.leftAt);
  const canEdit = myRole === "editor" || myRole === "presenter";

  return (
    <div className="h-screen flex flex-col bg-[hsl(222,47%,11%)] text-gray-200">
      <header className="h-11 flex items-center justify-between px-4 border-b border-[hsl(215,20%,25%)] shrink-0">
        <div className="flex items-center gap-3">
          <Radio className="w-4 h-4 text-red-400 animate-pulse" />
          <h1 className="text-sm font-semibold">{session.title}</h1>
          <Badge variant="outline" className={`text-[10px] ${session.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>
            {session.status === "active" ? "Live" : "Paused"}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[myRole]}`}>
            {myRole}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={copyShareLink}>
            {copied ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? "Copied" : "Share"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowParticipants(!showParticipants)}>
            <Users className="w-3 h-3 mr-1" />
            {activeParticipants.length}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowChat(!showChat)}>
            <MessageSquare className="w-3 h-3" />
          </Button>
          {myRole === "presenter" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => updateSession({ status: session.status === "active" ? "paused" : "active" })}
              >
                {session.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-400 hover:text-red-300"
                onClick={() => updateSession({ status: "ended" })}
              >
                End
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={leaveSession}>
            Leave
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <FileCode className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm">
              {canEdit ? "You can edit code in this session" : "You're watching in spectator mode"}
            </p>
            {session.activeFile && (
              <p className="text-xs mt-2 font-mono text-blue-400">{session.activeFile}</p>
            )}
            <Link href={`/project/${session.projectId}`}>
              <Button variant="outline" size="sm" className="mt-4">
                <ChevronRight className="w-3 h-3 mr-1" /> Open Project
              </Button>
            </Link>
          </div>
        </div>

        {showParticipants && (
          <div className="w-56 border-l border-[hsl(215,20%,25%)] flex flex-col">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-[hsl(215,20%,25%)]">
              Participants ({activeParticipants.length})
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeParticipants.map((p) => {
                const RoleIcon = ROLE_ICONS[p.role] || Eye;
                return (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[hsl(215,20%,15%)]">
                    <RoleIcon className={`w-3 h-3 shrink-0 ${ROLE_COLORS[p.role] || "text-gray-400"}`} />
                    <span className="text-xs truncate flex-1">{p.userName || "Anonymous"}</span>
                    {myRole === "presenter" && p.role !== "presenter" && (
                      <select
                        value={p.role}
                        onChange={(e) => changeRole(p.id, e.target.value)}
                        className="text-[10px] bg-transparent border border-[hsl(215,20%,25%)] rounded px-1 py-0.5 text-gray-400"
                      >
                        <option value="spectator">Spectator</option>
                        <option value="editor">Editor</option>
                        <option value="presenter">Presenter</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showChat && session.allowChat && (
          <div className="w-72 border-l border-[hsl(215,20%,25%)] flex flex-col">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-[hsl(215,20%,25%)]">
              Chat
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-medium text-blue-400">{msg.userName || "Unknown"}</span>
                    <span className="text-[9px] text-gray-600">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 break-words">{msg.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2 border-t border-[hsl(215,20%,25%)]">
              <div className="flex gap-1.5">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                  placeholder="Type a message..."
                  className="h-7 text-xs"
                />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={sendChat} disabled={!chatInput.trim()}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
