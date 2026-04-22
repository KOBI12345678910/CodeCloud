import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X, Network, Plus, Trash2, RefreshCw, Globe, Lock, Shield,
  Server, Wifi, ChevronDown, ChevronRight, Copy, Check,
  AlertCircle, Loader2, Radio, Settings, Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface NetworkItem {
  id: string;
  name: string;
  ownerId: string;
  subnet: string;
  policy: string;
  description: string | null;
  createdAt: string;
}

interface Member {
  id: string;
  networkId: string;
  projectId: string;
  hostname: string;
  internalIp: string;
  status: string;
  joinedAt: string;
}

interface ExposedPort {
  id: string;
  networkId: string;
  projectId: string;
  port: number;
  protocol: string;
  serviceName: string | null;
  isPublic: boolean;
}

interface ServiceInfo {
  projectId: string;
  hostname: string;
  internalIp: string;
  status: string;
  services: { id: string; port: number; protocol: string; serviceName: string | null; endpoint: string; isPublic: boolean }[];
}

interface PolicyItem {
  id: string;
  sourceProjectId: string | null;
  targetProjectId: string | null;
  action: string;
  ports: number[] | null;
  priority: number;
  description: string | null;
}

type View = "list" | "detail" | "create";

const safeFetch = async (url: string, opts?: RequestInit) => {
  const r = await fetch(url, { credentials: "include", ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({ error: r.statusText })); throw new Error(e.error || r.statusText); }
  if (r.status === 204) return null;
  return r.json();
};

export function ContainerNetwork({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [view, setView] = useState<View>("list");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkItem | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["members", "services", "ports"]));
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPolicy, setNewPolicy] = useState("allow_all");
  const [addMemberForm, setAddMemberForm] = useState(false);
  const [memberProjectId, setMemberProjectId] = useState("");
  const [memberHostname, setMemberHostname] = useState("");
  const [addPortForm, setAddPortForm] = useState(false);
  const [portProjectId, setPortProjectId] = useState("");
  const [portNumber, setPortNumber] = useState("");
  const [portService, setPortService] = useState("");
  const [portProtocol, setPortProtocol] = useState("tcp");
  const [portPublic, setPortPublic] = useState(false);
  const [addPolicyForm, setAddPolicyForm] = useState(false);
  const [policyAction, setPolicyAction] = useState("allow");
  const [policyDesc, setPolicyDesc] = useState("");
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: networks = [], isLoading: networksLoading } = useQuery<NetworkItem[]>({
    queryKey: ["networks"],
    queryFn: () => safeFetch(`${API}/networks`),
  });

  const { data: projectNetworks = [] } = useQuery<(NetworkItem & { membership: Member })[]>({
    queryKey: ["project-networks", projectId],
    queryFn: () => safeFetch(`${API}/projects/${projectId}/networks`),
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["network-members", selectedNetwork?.id],
    queryFn: () => safeFetch(`${API}/networks/${selectedNetwork!.id}/members`),
    enabled: !!selectedNetwork && view === "detail",
  });

  const { data: discoveredServices = [] } = useQuery<ServiceInfo[]>({
    queryKey: ["network-discover", selectedNetwork?.id],
    queryFn: () => safeFetch(`${API}/networks/${selectedNetwork!.id}/discover`),
    enabled: !!selectedNetwork && view === "detail",
  });

  const { data: policies = [] } = useQuery<PolicyItem[]>({
    queryKey: ["network-policies", selectedNetwork?.id],
    queryFn: () => safeFetch(`${API}/networks/${selectedNetwork!.id}/policies`),
    enabled: !!selectedNetwork && view === "detail",
  });

  const createNet = useMutation({
    mutationFn: () => safeFetch(`${API}/networks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc || undefined, policy: newPolicy }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["networks"] }); setView("list"); setNewName(""); setNewDesc(""); },
  });

  const deleteNet = useMutation({
    mutationFn: (id: string) => safeFetch(`${API}/networks/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["networks"] }); setSelectedNetwork(null); setView("list"); },
  });

  const addMemberMut = useMutation({
    mutationFn: () => safeFetch(`${API}/networks/${selectedNetwork!.id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: memberProjectId, hostname: memberHostname }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-members", selectedNetwork?.id] });
      qc.invalidateQueries({ queryKey: ["network-discover", selectedNetwork?.id] });
      setAddMemberForm(false); setMemberProjectId(""); setMemberHostname("");
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (memberId: string) => safeFetch(`${API}/networks/${selectedNetwork!.id}/members/${memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-members", selectedNetwork?.id] });
      qc.invalidateQueries({ queryKey: ["network-discover", selectedNetwork?.id] });
    },
  });

  const addPortMut = useMutation({
    mutationFn: () => safeFetch(`${API}/networks/${selectedNetwork!.id}/ports`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: portProjectId, port: parseInt(portNumber), protocol: portProtocol, serviceName: portService || undefined, isPublic: portPublic }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["network-discover", selectedNetwork?.id] });
      setAddPortForm(false); setPortProjectId(""); setPortNumber(""); setPortService("");
    },
  });

  const removePortMut = useMutation({
    mutationFn: (portId: string) => safeFetch(`${API}/networks/${selectedNetwork!.id}/ports/${portId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["network-discover", selectedNetwork?.id] }),
  });

  const addPolicyMut = useMutation({
    mutationFn: () => safeFetch(`${API}/networks/${selectedNetwork!.id}/policies`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: policyAction, description: policyDesc || undefined }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["network-policies", selectedNetwork?.id] }); setAddPolicyForm(false); setPolicyDesc(""); },
  });

  const removePolicyMut = useMutation({
    mutationFn: (policyId: string) => safeFetch(`${API}/networks/${selectedNetwork!.id}/policies/${policyId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["network-policies", selectedNetwork?.id] }),
  });

  const toggleSection = useCallback((s: string) => {
    setExpandedSections(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  }, []);

  const copyEndpoint = useCallback((ep: string) => {
    navigator.clipboard.writeText(ep);
    setCopiedEndpoint(ep);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  }, []);

  const policyLabel = (p: string) => p === "allow_all" ? "Allow All" : p === "deny_all" ? "Deny All" : "Custom";
  const policyColor = (p: string) => p === "allow_all" ? "text-green-500" : p === "deny_all" ? "text-red-500" : "text-yellow-500";

  return (
    <div className="h-full flex flex-col bg-background" data-testid="container-network-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          {view !== "list" && (
            <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => { setView("list"); setSelectedNetwork(null); }}>← Back</Button>
          )}
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5" />
            {view === "list" ? "Container Networks" : view === "create" ? "Create Network" : selectedNetwork?.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {view === "list" && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1" onClick={() => setView("create")}><Plus className="w-3 h-3" /> New</Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}><X className="w-3 h-3" /></Button>
        </div>
      </div>

      {view === "list" && (
        <div className="flex-1 overflow-y-auto">
          {projectNetworks.length > 0 && (
            <div className="px-3 py-1.5 border-b border-border/30">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">This Project's Networks</p>
              {projectNetworks.map(n => (
                <button key={n.id} className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/20 flex items-center gap-2"
                  onClick={() => { setSelectedNetwork(n); setView("detail"); }}>
                  <Radio className="w-3 h-3 text-green-500" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">{n.name}</span>
                    <span className="text-[9px] text-muted-foreground ml-2">{n.membership?.hostname} ({n.membership?.internalIp})</span>
                  </div>
                  <span className={`text-[9px] ${policyColor(n.policy)}`}>{policyLabel(n.policy)}</span>
                </button>
              ))}
            </div>
          )}
          {networksLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : networks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <Network className="w-8 h-8 opacity-30" />
              <p className="text-xs">No networks created</p>
              <p className="text-[10px]">Create one to connect containers</p>
            </div>
          ) : (
            <div className="px-3 py-1.5">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">All Networks</p>
              <div className="space-y-0.5">
                {networks.map(n => (
                  <button key={n.id} className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/20 flex items-center gap-2 group"
                    onClick={() => { setSelectedNetwork(n); setView("detail"); }}>
                    <Network className="w-3 h-3 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{n.name}</span>
                      <span className="text-[9px] text-muted-foreground ml-2 font-mono">{n.subnet}</span>
                    </div>
                    <span className={`text-[9px] ${policyColor(n.policy)}`}>{policyLabel(n.policy)}</span>
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-red-500"
                      onClick={e => { e.stopPropagation(); deleteNet.mutate(n.id); }}><Trash2 className="w-3 h-3" /></Button>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "create" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Network name" className="h-7 text-xs" />
          <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="h-7 text-xs" />
          <div>
            <label className="text-[9px] text-muted-foreground mb-0.5 block">Network Policy</label>
            <select value={newPolicy} onChange={e => setNewPolicy(e.target.value)}
              className="w-full h-7 bg-muted/30 border border-border/50 rounded px-2 text-xs outline-none">
              <option value="allow_all">Allow All Traffic</option>
              <option value="deny_all">Deny All (Explicit Allow Only)</option>
              <option value="custom">Custom Policies</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => createNet.mutate()} disabled={!newName.trim() || createNet.isPending}>
              {createNet.isPending ? "Creating..." : "Create Network"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setView("list")}>Cancel</Button>
          </div>
          {createNet.isError && <p className="text-[10px] text-red-500">{(createNet.error as Error).message}</p>}
        </div>
      )}

      {view === "detail" && selectedNetwork && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border/30">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">{selectedNetwork.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${selectedNetwork.policy === "allow_all" ? "bg-green-500/15 text-green-500" : selectedNetwork.policy === "deny_all" ? "bg-red-500/15 text-red-500" : "bg-yellow-500/15 text-yellow-500"}`}>
                {policyLabel(selectedNetwork.policy)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
              <span className="font-mono">{selectedNetwork.subnet}</span>
              <span>{members.length} member{members.length !== 1 ? "s" : ""}</span>
            </div>
            {selectedNetwork.description && <p className="text-[10px] text-muted-foreground mt-1">{selectedNetwork.description}</p>}
          </div>

          <div className="divide-y divide-border/20">
            <div>
              <button className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection("members")}>
                {expandedSections.has("members") ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Members <span className="text-[9px] opacity-60">({members.length})</span>
                <div className="flex-1" />
                <span className="text-[9px] text-primary cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); setAddMemberForm(!addMemberForm); }}>+ Add</span>
              </button>
              {expandedSections.has("members") && (
                <div className="px-3 pb-2 space-y-1">
                  {addMemberForm && (
                    <div className="bg-muted/30 rounded p-2 space-y-1.5">
                      <Input value={memberProjectId} onChange={e => setMemberProjectId(e.target.value)} placeholder="Project ID" className="h-6 text-[10px]" />
                      <Input value={memberHostname} onChange={e => setMemberHostname(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="hostname (e.g. my-api)" className="h-6 text-[10px] font-mono" />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-5 text-[9px] px-2" onClick={() => addMemberMut.mutate()}
                          disabled={!memberProjectId || !memberHostname || addMemberMut.isPending}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2" onClick={() => setAddMemberForm(false)}>Cancel</Button>
                      </div>
                      {addMemberMut.isError && <p className="text-[9px] text-red-500">{(addMemberMut.error as Error).message}</p>}
                    </div>
                  )}
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-2 py-0.5 group">
                      <Server className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-[10px] font-mono font-medium">{m.hostname}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">{m.internalIp}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.status === "active" ? "bg-green-500" : "bg-muted-foreground"}`} />
                      <div className="flex-1" />
                      <Button size="sm" variant="ghost" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-red-500"
                        onClick={() => removeMemberMut.mutate(m.id)}><Trash2 className="w-2.5 h-2.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <button className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection("services")}>
                {expandedSections.has("services") ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Service Discovery
                <div className="flex-1" />
                <span className="text-[9px] text-primary cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); setAddPortForm(!addPortForm); }}>+ Expose Port</span>
              </button>
              {expandedSections.has("services") && (
                <div className="px-3 pb-2 space-y-1.5">
                  {addPortForm && (
                    <div className="bg-muted/30 rounded p-2 space-y-1.5">
                      <Input value={portProjectId} onChange={e => setPortProjectId(e.target.value)} placeholder="Project ID" className="h-6 text-[10px]" />
                      <div className="flex gap-1">
                        <Input value={portNumber} onChange={e => setPortNumber(e.target.value.replace(/\D/g, ""))} placeholder="Port" className="h-6 text-[10px] w-20" />
                        <select value={portProtocol} onChange={e => setPortProtocol(e.target.value)} className="h-6 bg-muted/30 border border-border/50 rounded px-1 text-[10px] w-16">
                          <option value="tcp">TCP</option>
                          <option value="udp">UDP</option>
                        </select>
                        <Input value={portService} onChange={e => setPortService(e.target.value)} placeholder="Service name" className="h-6 text-[10px] flex-1" />
                      </div>
                      <label className="flex items-center gap-1 text-[9px]">
                        <input type="checkbox" checked={portPublic} onChange={e => setPortPublic(e.target.checked)} /> Public
                      </label>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-5 text-[9px] px-2" onClick={() => addPortMut.mutate()}
                          disabled={!portProjectId || !portNumber || addPortMut.isPending}>Expose</Button>
                        <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2" onClick={() => setAddPortForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  {discoveredServices.length === 0 ? (
                    <p className="text-[9px] text-muted-foreground">No services discovered</p>
                  ) : (
                    discoveredServices.map(svc => (
                      <div key={svc.projectId} className="border border-border/30 rounded p-1.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Wifi className={`w-3 h-3 ${svc.status === "active" ? "text-green-500" : "text-muted-foreground"}`} />
                          <span className="text-[10px] font-mono font-medium">{svc.hostname}</span>
                          <span className="text-[8px] text-muted-foreground">{svc.internalIp}</span>
                        </div>
                        {svc.services.length === 0 ? (
                          <p className="text-[8px] text-muted-foreground pl-4">No exposed ports</p>
                        ) : (
                          <div className="pl-4 space-y-0.5">
                            {svc.services.map(s => (
                              <div key={s.id} className="flex items-center gap-1.5 text-[9px] group/port">
                                <Plug className="w-2.5 h-2.5 text-muted-foreground" />
                                <span className="font-mono">{s.endpoint}</span>
                                <span className="text-muted-foreground">{s.protocol}</span>
                                {s.serviceName && <span className="text-muted-foreground">({s.serviceName})</span>}
                                {s.isPublic ? <Globe className="w-2.5 h-2.5 text-blue-400" /> : <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                                <button className="opacity-0 group-hover/port:opacity-100" onClick={() => copyEndpoint(s.endpoint)}>
                                  {copiedEndpoint === s.endpoint ? <Check className="w-2.5 h-2.5 text-green-500" /> : <Copy className="w-2.5 h-2.5 text-muted-foreground" />}
                                </button>
                                <button className="opacity-0 group-hover/port:opacity-100 text-red-500" onClick={() => removePortMut.mutate(s.id)}>
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <button className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection("policies")}>
                {expandedSections.has("policies") ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Network Policies <span className="text-[9px] opacity-60">({policies.length})</span>
                <div className="flex-1" />
                <span className="text-[9px] text-primary cursor-pointer hover:underline" onClick={e => { e.stopPropagation(); setAddPolicyForm(!addPolicyForm); }}>+ Add</span>
              </button>
              {expandedSections.has("policies") && (
                <div className="px-3 pb-2 space-y-1">
                  {addPolicyForm && (
                    <div className="bg-muted/30 rounded p-2 space-y-1.5">
                      <select value={policyAction} onChange={e => setPolicyAction(e.target.value)} className="w-full h-6 bg-muted/30 border border-border/50 rounded px-1 text-[10px]">
                        <option value="allow">Allow</option>
                        <option value="deny">Deny</option>
                      </select>
                      <Input value={policyDesc} onChange={e => setPolicyDesc(e.target.value)} placeholder="Description" className="h-6 text-[10px]" />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-5 text-[9px] px-2" onClick={() => addPolicyMut.mutate()} disabled={addPolicyMut.isPending}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2" onClick={() => setAddPolicyForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                  {policies.length === 0 ? (
                    <p className="text-[9px] text-muted-foreground">No custom policies</p>
                  ) : (
                    policies.map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 py-0.5 group">
                        <Shield className={`w-3 h-3 ${p.action === "allow" ? "text-green-500" : "text-red-500"}`} />
                        <span className={`text-[10px] font-medium ${p.action === "allow" ? "text-green-500" : "text-red-500"}`}>{p.action.toUpperCase()}</span>
                        {p.description && <span className="text-[9px] text-muted-foreground truncate">{p.description}</span>}
                        <span className="text-[8px] text-muted-foreground">pri:{p.priority}</span>
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-red-500"
                          onClick={() => removePolicyMut.mutate(p.id)}><Trash2 className="w-2.5 h-2.5" /></Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 py-1 border-t border-border/50 flex items-center justify-between text-[9px] text-muted-foreground shrink-0">
        <span>{networks.length} network{networks.length !== 1 ? "s" : ""}</span>
        <span>{projectNetworks.length} connected to this project</span>
      </div>
    </div>
  );
}
