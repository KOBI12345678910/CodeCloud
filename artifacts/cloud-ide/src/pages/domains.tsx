import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Globe, Trash2, RefreshCw, Check, X, AlertCircle, ExternalLink,
  Shield, ArrowLeft, Copy, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface DomainEntry {
  id: string;
  domain: string;
  project_id: string;
  project_name: string;
  project_slug: string;
  ssl_status: "pending" | "provisioning" | "active" | "failed";
  dns_verified: boolean;
  verification_record: string;
  created_at: string;
}

const apiUrl = import.meta.env.VITE_API_URL || "";

export default function DomainsPage() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "add" | "buy">("my");

  const [addDomain, setAddDomain] = useState("");
  const [addProjectId, setAddProjectId] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<any>(null);

  const [searchDomain, setSearchDomain] = useState("");
  const [buyResult, setBuyResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
    fetch(`${apiUrl}/api/projects?limit=100`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || data || []))
      .catch(() => {});
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/domains/my`, { credentials: "include" });
      const data = await res.json();
      setDomains(data.domains || []);
    } catch {}
    setLoading(false);
  };

  const handleAddDomain = async () => {
    if (!addDomain || !addProjectId) return;
    setAdding(true);
    setAddResult(null);
    try {
      const res = await fetch(`${apiUrl}/api/projects/${addProjectId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: addDomain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddResult({ error: data.error || "Failed to add domain" });
      } else {
        setAddResult(data);
        setAddDomain("");
        fetchDomains();
      }
    } catch {
      setAddResult({ error: "Failed to add domain" });
    }
    setAdding(false);
  };

  const handleVerify = async (domainId: string) => {
    setVerifying(domainId);
    setVerifyResult(null);
    try {
      const res = await fetch(`${apiUrl}/api/domains/${domainId}/verify`, { method: "POST", credentials: "include" });
      const data = await res.json();
      setVerifyResult({ domainId, ...data });
      fetchDomains();
    } catch {
      setVerifyResult({ domainId, verified: false, errors: ["Verification failed"] });
    }
    setVerifying(null);
  };

  const handleRemove = async (domainId: string) => {
    if (!confirm("Remove this domain? Your site will no longer be accessible at this address.")) return;
    try {
      await fetch(`${apiUrl}/api/domains/${domainId}`, { method: "DELETE", credentials: "include" });
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
      toast({ title: "Domain removed" });
    } catch {}
  };

  const handleSearchDomain = async () => {
    if (!searchDomain) return;
    setSearching(true);
    setBuyResult(null);
    try {
      const res = await fetch(`${apiUrl}/api/domains/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: searchDomain }),
      });
      const data = await res.json();
      setBuyResult(data);
    } catch {}
    setSearching(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const SSL_STATUS = {
    pending: { icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted", label: "Pending DNS" },
    provisioning: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Provisioning SSL" },
    active: { icon: Shield, color: "text-green-500", bg: "bg-green-500/10", label: "SSL Active" },
    failed: { icon: X, color: "text-destructive", bg: "bg-destructive/10", label: "SSL Failed" },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border">
        <Link href="/settings"><ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-pointer" /></Link>
        <Globe className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Domains</h1>
        <span className="text-xs text-muted-foreground">{domains.length} domains</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-4 border-b border-border mb-6">
          {[
            { id: "my", label: "My Domains" },
            { id: "add", label: "Add Custom Domain" },
            { id: "buy", label: "Buy a Domain" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`pb-3 text-sm font-medium transition ${tab === t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "my" && (
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : domains.length === 0 ? (
              <div className="text-center py-16">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No custom domains yet</p>
                <p className="text-xs text-muted-foreground mb-4">Add a custom domain to your deployed projects</p>
                <Button onClick={() => setTab("add")} size="sm">Add Domain</Button>
              </div>
            ) : (
              domains.map((domain) => {
                const ssl = SSL_STATUS[domain.ssl_status] || SSL_STATUS.pending;
                const SslIcon = ssl.icon;
                return (
                  <div key={domain.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-primary" />
                        <div>
                          <a href={`https://${domain.domain}`} target="_blank" rel="noopener noreferrer"
                            className="font-semibold hover:text-primary transition flex items-center gap-1">
                            {domain.domain} <ExternalLink className="w-3 h-3" />
                          </a>
                          <p className="text-xs text-muted-foreground">{domain.project_name || domain.project_slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 text-xs ${ssl.color} ${ssl.bg} px-2.5 py-1 rounded-full`}>
                          <SslIcon className={`w-3 h-3 ${domain.ssl_status === "provisioning" ? "animate-spin" : ""}`} />
                          {ssl.label}
                        </span>
                        {!domain.dns_verified && (
                          <Button variant="ghost" size="sm" onClick={() => handleVerify(domain.id)} disabled={verifying === domain.id}>
                            {verifying === domain.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            <span className="ml-1">Verify DNS</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(domain.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className={`flex items-center gap-1 ${domain.dns_verified ? "text-green-500" : "text-muted-foreground"}`}>
                        {domain.dns_verified ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} DNS
                      </span>
                      <span className={`flex items-center gap-1 ${domain.ssl_status === "active" ? "text-green-500" : "text-muted-foreground"}`}>
                        {domain.ssl_status === "active" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} SSL
                      </span>
                      <span className="text-muted-foreground">Added {new Date(domain.created_at).toLocaleDateString()}</span>
                    </div>

                    {verifyResult?.domainId === domain.id && (
                      <div className={`mt-3 p-3 rounded-lg text-xs ${verifyResult.verified ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                        {verifyResult.verified ? (
                          <p className="flex items-center gap-1"><Check className="w-3 h-3" /> DNS verified! SSL certificate is being provisioned.</p>
                        ) : (
                          <div>
                            <p className="font-medium mb-1">DNS verification failed:</p>
                            <ul className="list-disc ml-4 space-y-0.5">
                              {verifyResult.errors?.map((err: string, i: number) => <li key={i}>{err}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "add" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Add Custom Domain</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Domain</label>
                  <Input value={addDomain} onChange={(e) => setAddDomain(e.target.value)} placeholder="example.com or app.example.com" />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Project</label>
                  <select value={addProjectId} onChange={(e) => setAddProjectId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm">
                    <option value="">Select a project...</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>)}
                  </select>
                </div>
                <Button onClick={handleAddDomain} disabled={!addDomain || !addProjectId || adding} className="w-full">
                  {adding ? "Adding..." : "Add Domain"}
                </Button>
              </div>
            </div>

            {addResult && !addResult.error && (
              <div className="bg-card border border-primary/30 rounded-xl p-6">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> Domain added! Configure your DNS:
                </h3>
                <div className="space-y-3">
                  {addResult.dnsInstructions?.map((dns: any, i: number) => (
                    <div key={i} className="bg-muted rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{dns.type} Record</span>
                        <button onClick={() => copyToClipboard(dns.value, `dns-${i}`)} className="text-xs text-primary hover:underline flex items-center gap-1">
                          {copied === `dns-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied === `dns-${i}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Name: <code className="bg-background px-1 rounded">{dns.name}</code></p>
                      <p className="text-xs text-muted-foreground">Value: <code className="bg-background px-1 rounded break-all">{dns.value}</code></p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {addResult?.error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm text-destructive">
                {addResult.error}
              </div>
            )}
          </div>
        )}

        {tab === "buy" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Search for a Domain</h3>
              <div className="flex gap-2">
                <Input value={searchDomain} onChange={(e) => setSearchDomain(e.target.value)}
                  placeholder="myproject.com" className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSearchDomain()} />
                <Button onClick={handleSearchDomain} disabled={!searchDomain || searching}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            {buyResult && (
              <div className="space-y-3">
                <div className={`bg-card border rounded-xl p-5 ${buyResult.available ? "border-green-500/30" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <span className="font-semibold">{searchDomain}</span>
                    </div>
                    {buyResult.available ? (
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-500">${buyResult.price}/yr</span>
                        <Button size="sm">Purchase</Button>
                      </div>
                    ) : (
                      <span className="text-sm text-destructive font-medium">Unavailable</span>
                    )}
                  </div>
                </div>

                {buyResult.suggestions?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Suggestions:</p>
                    {buyResult.suggestions.map((s: any) => (
                      <div key={s.domain} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{s.domain}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">${s.price}/yr</span>
                          <Button variant="outline" size="sm">Purchase</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
