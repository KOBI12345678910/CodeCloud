import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Plus, RefreshCw, Trash2, Lock, Unlock, RotateCw, X, Copy, Check, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface SslCertificate {
  id: string;
  projectId: string;
  domain: string;
  status: "pending" | "issuing" | "active" | "expiring" | "expired" | "failed" | "revoked";
  issuer: string | null;
  serialNumber: string | null;
  fingerprint: string | null;
  forceHttps: boolean;
  autoRenew: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  lastRenewalAt: string | null;
  lastRenewalError: string | null;
  dnsVerified: boolean;
  verificationToken: string | null;
  createdAt: string;
}

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active": return <ShieldCheck className="w-4 h-4 text-green-500" />;
    case "expiring": return <ShieldAlert className="w-4 h-4 text-yellow-500" />;
    case "expired": case "failed": case "revoked": return <ShieldX className="w-4 h-4 text-red-500" />;
    case "issuing": return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    default: return <Shield className="w-4 h-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    expiring: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    expired: "bg-red-500/10 text-red-500 border-red-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
    revoked: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    issuing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    pending: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors[status] || colors.pending}`}>
      {status.toUpperCase()}
    </span>
  );
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function SSLCertificates({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [newDomain, setNewDomain] = useState("");
  const [forceHttps, setForceHttps] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const qc = useQueryClient();

  const { data: certs = [], isLoading } = useQuery<SslCertificate[]>({
    queryKey: ["ssl-certs", projectId],
    queryFn: () => fetch(`${API}/projects/${projectId}/ssl`, { credentials: "include" }).then(r => r.json()),
  });

  const requestCert = useMutation({
    mutationFn: () => fetch(`${API}/projects/${projectId}/ssl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ domain: newDomain.toLowerCase().trim(), forceHttps }),
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ssl-certs", projectId] }); setNewDomain(""); setShowAdd(false); },
  });

  const verifyDns = useMutation({
    mutationFn: (certId: string) => fetch(`${API}/ssl/${certId}/verify-dns`, {
      method: "POST", credentials: "include",
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssl-certs", projectId] }),
  });

  const renewCert = useMutation({
    mutationFn: (certId: string) => fetch(`${API}/ssl/${certId}/renew`, {
      method: "POST", credentials: "include",
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssl-certs", projectId] }),
  });

  const revokeCert = useMutation({
    mutationFn: (certId: string) => fetch(`${API}/ssl/${certId}/revoke`, {
      method: "POST", credentials: "include",
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssl-certs", projectId] }),
  });

  const deleteCert = useMutation({
    mutationFn: (certId: string) => fetch(`${API}/ssl/${certId}`, {
      method: "DELETE", credentials: "include",
    }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssl-certs", projectId] }),
  });

  const toggleHttps = useMutation({
    mutationFn: ({ certId, val }: { certId: string; val: boolean }) => fetch(`${API}/ssl/${certId}/force-https`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ forceHttps: val }),
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssl-certs", projectId] }),
  });

  const toggleAutoRenew = useMutation({
    mutationFn: ({ certId, val }: { certId: string; val: boolean }) => fetch(`${API}/ssl/${certId}/auto-renew`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ autoRenew: val }),
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ssl-certs", projectId] }),
  });

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="ssl-certificates-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span className="text-xs font-medium">SSL Certificates</span>
          <span className="text-[10px] text-muted-foreground">({certs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs gap-1" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-3 h-3" /> Add Domain
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="h-7 text-xs flex-1"
              onKeyDown={e => e.key === "Enter" && newDomain.trim() && requestCert.mutate()}
            />
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => requestCert.mutate()}
              disabled={!newDomain.trim() || requestCert.isPending}
            >
              {requestCert.isPending ? "Requesting..." : "Request Certificate"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={forceHttps} onCheckedChange={setForceHttps} className="scale-75" />
            <span className="text-[10px] text-muted-foreground">Force HTTPS redirect</span>
          </div>
          {requestCert.isError && (
            <p className="text-[10px] text-red-500 mt-1">{(requestCert.error as Error).message}</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <Shield className="w-8 h-8 opacity-40" />
            <p className="text-xs">No SSL certificates configured</p>
            <p className="text-[10px]">Add a custom domain to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {certs.map(cert => (
              <div key={cert.id} className="group">
                <div
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedId(expandedId === cert.id ? null : cert.id)}
                >
                  <StatusIcon status={cert.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{cert.domain}</span>
                      <StatusBadge status={cert.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {cert.expiresAt && (
                        <span className={`text-[10px] ${daysUntil(cert.expiresAt) < 14 ? "text-red-500" : daysUntil(cert.expiresAt) < 30 ? "text-yellow-500" : "text-muted-foreground"}`}>
                          {daysUntil(cert.expiresAt) > 0 ? `Expires in ${daysUntil(cert.expiresAt)} days` : "Expired"}
                        </span>
                      )}
                      {cert.issuer && <span className="text-[10px] text-muted-foreground">{cert.issuer}</span>}
                      {cert.forceHttps && (
                        <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> HTTPS
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    {(cert.status === "active" || cert.status === "expiring") && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); renewCert.mutate(cert.id); }}
                        title="Renew">
                        <RotateCw className="w-3 h-3" />
                      </Button>
                    )}
                    {cert.status === "pending" && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                        onClick={e => { e.stopPropagation(); verifyDns.mutate(cert.id); }}
                        disabled={verifyDns.isPending}>
                        Verify DNS
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={e => { e.stopPropagation(); deleteCert.mutate(cert.id); }}
                      title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {expandedId === cert.id && (
                  <div className="px-3 pb-3 bg-muted/20 space-y-3">
                    {cert.status === "pending" && cert.verificationToken && (
                      <div className="bg-orange-500/5 border border-orange-500/20 rounded p-2 space-y-1">
                        <p className="text-[10px] font-medium text-orange-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> DNS Verification Required
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Add a TXT record to your DNS with the following value:
                        </p>
                        <div className="flex items-center gap-1 bg-background rounded px-2 py-1">
                          <code className="text-[10px] font-mono flex-1 truncate">{cert.verificationToken}</code>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyToken(cert.verificationToken!)}>
                            {copiedToken ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Record: <code className="font-mono">_acme-challenge.{cert.domain}</code>
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">Issued:</span>{" "}
                        <span>{formatDate(cert.issuedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expires:</span>{" "}
                        <span className={cert.expiresAt && daysUntil(cert.expiresAt) < 14 ? "text-red-500 font-medium" : ""}>
                          {formatDate(cert.expiresAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Renewed:</span>{" "}
                        <span>{formatDate(cert.lastRenewalAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Serial:</span>{" "}
                        <span className="font-mono">{cert.serialNumber ? cert.serialNumber.substring(0, 16) + "..." : "—"}</span>
                      </div>
                    </div>

                    {cert.fingerprint && (
                      <div className="text-[10px]">
                        <span className="text-muted-foreground">Fingerprint:</span>{" "}
                        <code className="font-mono text-[9px]">{cert.fingerprint.substring(0, 40)}...</code>
                      </div>
                    )}

                    {cert.lastRenewalError && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                        <p className="text-[10px] text-red-500">{cert.lastRenewalError}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cert.forceHttps}
                          onCheckedChange={val => toggleHttps.mutate({ certId: cert.id, val })}
                          className="scale-75"
                        />
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {cert.forceHttps ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                          Force HTTPS
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cert.autoRenew}
                          onCheckedChange={val => toggleAutoRenew.mutate({ certId: cert.id, val })}
                          className="scale-75"
                        />
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Auto-Renew
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(cert.status === "active" || cert.status === "expiring") && (
                        <>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1"
                            onClick={() => renewCert.mutate(cert.id)} disabled={renewCert.isPending}>
                            <RotateCw className="w-3 h-3" /> Renew Now
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 text-red-500"
                            onClick={() => revokeCert.mutate(cert.id)} disabled={revokeCert.isPending}>
                            <ShieldX className="w-3 h-3" /> Revoke
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1 text-red-500 ml-auto"
                        onClick={() => deleteCert.mutate(cert.id)} disabled={deleteCert.isPending}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
