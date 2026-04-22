import { useState, useEffect, useCallback } from "react";
import {
  Network, ExternalLink, Globe, X, RefreshCw, Copy, Check,
  Circle, Loader2, Unplug, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface PortInfo {
  port: number;
  pid: number;
  process: string;
  state: string;
  protocol: string;
  startedAt: string;
  publicUrl?: string;
}

interface PortManagerProps {
  projectId: string;
  onOpenPreview?: (port: number) => void;
}

function formatUptime(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function PortManager({ projectId, onOpenPreview }: PortManagerProps) {
  const { toast } = useToast();
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedPort, setCopiedPort] = useState<number | null>(null);
  const [forwardingPort, setForwardingPort] = useState<number | null>(null);

  const fetchPorts = useCallback(async (showLoader = true) => {
    if (showLoader) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/ports`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPorts(data.ports);
      }
    } catch {
      toast({ title: "Failed to detect ports", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPorts(false);
    const interval = setInterval(() => fetchPorts(false), 10000);
    return () => clearInterval(interval);
  }, [fetchPorts]);

  const handleForward = useCallback(async (port: number) => {
    setForwardingPort(port);
    try {
      const res = await fetch(`${API_BASE}/api/ports/${port}/forward`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPorts((prev) => prev.map((p) => p.port === port ? { ...p, publicUrl: data.publicUrl } : p));
        toast({ title: `Port ${port} forwarded` });
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to forward", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to forward port", variant: "destructive" });
    } finally {
      setForwardingPort(null);
    }
  }, [toast]);

  const handleUnforward = useCallback(async (port: number) => {
    try {
      await fetch(`${API_BASE}/api/ports/${port}/unforward`, {
        method: "POST", credentials: "include",
      });
      setPorts((prev) => prev.map((p) => p.port === port ? { ...p, publicUrl: undefined } : p));
      toast({ title: `Port ${port} unforwarded` });
    } catch {
      toast({ title: "Failed to unforward", variant: "destructive" });
    }
  }, [toast]);

  const handleClose = useCallback(async (port: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/ports/${port}/close`, {
        method: "POST", credentials: "include",
      });
      if (res.ok) {
        setPorts((prev) => prev.filter((p) => p.port !== port));
        toast({ title: `Port ${port} closed` });
      }
    } catch {
      toast({ title: "Failed to close port", variant: "destructive" });
    }
  }, [toast]);

  const copyUrl = useCallback((url: string, port: number) => {
    navigator.clipboard.writeText(url);
    setCopiedPort(port);
    setTimeout(() => setCopiedPort(null), 2000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <Network className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Ports</span>
          {ports.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ports.length}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => fetchPorts(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {ports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Network className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-xs text-muted-foreground mb-1">No open ports detected</p>
            <p className="text-[10px] text-muted-foreground/70">
              Ports will appear here when your app starts listening
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {ports.map((port) => (
              <div key={port.port} className="px-3 py-2.5 hover:bg-muted/20 transition-colors group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
                    <span className="text-sm font-mono font-medium">{port.port}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {port.process}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onOpenPreview && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onOpenPreview(port.port)}
                        title="Open in preview"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-300"
                      onClick={() => handleClose(port.port)}
                      title="Close port"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{port.protocol.toUpperCase()}</span>
                  <span>·</span>
                  <span>PID {port.pid}</span>
                  <span>·</span>
                  <span>{formatUptime(port.startedAt)}</span>
                </div>

                {port.publicUrl ? (
                  <div className="mt-2 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-emerald-400 font-mono truncate flex-1">{port.publicUrl}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyUrl(port.publicUrl!, port.port)}
                    >
                      {copiedPort === port.port ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleUnforward(port.port)}
                      title="Stop forwarding"
                    >
                      <Unplug className="w-2.5 h-2.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 h-6 text-[10px] text-blue-400 hover:text-blue-300 px-1.5"
                    onClick={() => handleForward(port.port)}
                    disabled={forwardingPort === port.port}
                  >
                    {forwardingPort === port.port ? (
                      <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
                    ) : (
                      <Link2 className="w-2.5 h-2.5 mr-1" />
                    )}
                    Forward to public URL
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
