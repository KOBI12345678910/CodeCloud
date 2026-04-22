import React, { useState, useCallback } from "react";
import {
  Server, Plus, Trash2, Save, RefreshCw, CheckCircle, AlertTriangle,
  X, ChevronDown, ChevronRight, Globe, Shield, Zap, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NginxLocation {
  path: string;
  proxyPass: string | null;
  root: string | null;
  tryFiles: string | null;
  rewrite: string | null;
  headers: Record<string, string>;
}

interface NginxUpstream {
  name: string;
  servers: { address: string; weight: number; backup: boolean }[];
  method: "round_robin" | "least_conn" | "ip_hash";
}

interface NginxConfigEditorProps {
  projectId?: string;
  onClose?: () => void;
}

export function NginxConfigEditor({ projectId, onClose }: NginxConfigEditorProps): React.ReactElement {
  const [tab, setTab] = useState<"visual" | "raw">("visual");
  const [configName, setConfigName] = useState("my-app");
  const [locations, setLocations] = useState<NginxLocation[]>([
    { path: "/", proxyPass: "http://localhost:3000", root: null, tryFiles: null, rewrite: null, headers: {} },
    { path: "/static/", proxyPass: null, root: "/var/www/static", tryFiles: "$uri $uri/ =404", rewrite: null, headers: { "Cache-Control": "public, max-age=31536000" } },
    { path: "/api/", proxyPass: "http://localhost:4000", root: null, tryFiles: null, rewrite: null, headers: { "X-Real-IP": "$remote_addr" } },
  ]);
  const [upstreams, setUpstreams] = useState<NginxUpstream[]>([
    { name: "app", servers: [{ address: "127.0.0.1:3000", weight: 1, backup: false }], method: "round_robin" },
  ]);
  const [gzip, setGzip] = useState(true);
  const [ssl, setSsl] = useState(true);
  const [http2, setHttp2] = useState(true);
  const [headers, setHeaders] = useState<Record<string, string>>({
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
  });
  const [rawConfig, setRawConfig] = useState("");
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["locations", "upstreams", "security"]));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  };

  const generateRawConfig = useCallback(() => {
    let lines: string[] = [];
    for (const u of upstreams) {
      lines.push(`upstream ${u.name} {`);
      if (u.method !== "round_robin") lines.push(`    ${u.method};`);
      for (const s of u.servers) {
        let l = `    server ${s.address}`;
        if (s.weight !== 1) l += ` weight=${s.weight}`;
        if (s.backup) l += " backup";
        lines.push(l + ";");
      }
      lines.push("}", "");
    }
    lines.push("server {");
    lines.push(ssl ? `    listen 443 ssl${http2 ? " http2" : ""};` : "    listen 80;");
    lines.push(`    server_name ${configName}.codecloud.dev;`, "");
    if (gzip) lines.push("    gzip on;", "    gzip_types text/plain text/css application/json application/javascript;", "");
    for (const [k, v] of Object.entries(headers)) lines.push(`    add_header ${k} "${v}";`);
    if (Object.keys(headers).length) lines.push("");
    for (const loc of locations) {
      lines.push(`    location ${loc.path} {`);
      if (loc.proxyPass) {
        lines.push(`        proxy_pass ${loc.proxyPass};`);
        lines.push("        proxy_http_version 1.1;");
        lines.push("        proxy_set_header Host $host;");
      }
      if (loc.root) lines.push(`        root ${loc.root};`);
      if (loc.tryFiles) lines.push(`        try_files ${loc.tryFiles};`);
      for (const [k, v] of Object.entries(loc.headers)) lines.push(`        add_header ${k} "${v}";`);
      lines.push("    }");
    }
    lines.push("}");
    return lines.join("\n");
  }, [configName, locations, upstreams, gzip, ssl, http2, headers]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      await fetch(`${apiUrl}/api/nginx-config`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ projectId, name: configName }),
      });
      setValidation({ valid: true, errors: [] });
    } catch {
      setValidation({ valid: false, errors: ["Failed to save configuration"] });
    }
    setSaving(false);
  };

  const handleValidate = async () => {
    const config = tab === "raw" ? rawConfig : generateRawConfig();
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiUrl}/api/nginx-config/validate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ config }),
      });
      setValidation(await res.json());
    } catch {
      setValidation({ valid: false, errors: ["Validation request failed"] });
    }
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string; title: string; icon: React.ElementType }) => (
    <button onClick={() => toggleSection(id)}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 text-left">
      {expandedSections.has(id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <Icon size={12} className="text-muted-foreground" />
      <span className="text-xs font-medium">{title}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-green-400" />
          <span className="text-xs font-medium">Nginx Configuration</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleValidate} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">
            <CheckCircle size={10} /> Validate
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-green-600/20 text-green-400 hover:bg-green-600/30 disabled:opacity-50">
            <Save size={10} /> {saving ? "Saving..." : "Save"}
          </button>
          {onClose && <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>}
        </div>
      </div>

      {validation && (
        <div className={`flex items-center gap-2 px-3 py-1.5 text-[10px] ${validation.valid ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {validation.valid ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
          {validation.valid ? "Configuration is valid" : validation.errors.join("; ")}
        </div>
      )}

      <div className="flex items-center border-b border-[#333]">
        {(["visual", "raw"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === "raw") setRawConfig(generateRawConfig()); }}
            className={`px-3 py-1.5 text-[10px] font-medium ${tab === t ? "bg-[#1e1e1e] text-gray-200 border-b border-primary" : "bg-[#252526] text-gray-500 hover:text-gray-300"}`}>
            {t === "visual" ? "Visual Editor" : "Raw Config"}
          </button>
        ))}
        <div className="flex-1 bg-[#252526]" />
        <div className="px-3 bg-[#252526]">
          <input value={configName} onChange={e => setConfigName(e.target.value)}
            className="bg-transparent text-xs text-gray-400 outline-none w-32 text-right" placeholder="config name" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "visual" ? (
          <div className="divide-y divide-[#2a2a2a]">
            <div>
              <SectionHeader id="general" title="General Settings" icon={Settings} />
              {expandedSections.has("general") && (
                <div className="px-4 py-2 space-y-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={ssl} onChange={e => setSsl(e.target.checked)} className="accent-primary" />
                    <Shield size={10} /> SSL / HTTPS
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={http2} onChange={e => setHttp2(e.target.checked)} className="accent-primary" />
                    <Zap size={10} /> HTTP/2
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={gzip} onChange={e => setGzip(e.target.checked)} className="accent-primary" />
                    <RefreshCw size={10} /> Gzip Compression
                  </label>
                </div>
              )}
            </div>

            <div>
              <SectionHeader id="locations" title={`Location Blocks (${locations.length})`} icon={Globe} />
              {expandedSections.has("locations") && (
                <div className="px-4 py-2 space-y-2">
                  {locations.map((loc, i) => (
                    <div key={i} className="bg-[#2a2d2e] rounded p-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input value={loc.path} onChange={e => {
                          const next = [...locations]; next[i] = { ...next[i], path: e.target.value }; setLocations(next);
                        }} className="flex-1 bg-[#1e1e1e] px-2 py-1 rounded text-xs font-mono text-gray-300 outline-none" placeholder="/path/" />
                        <button onClick={() => setLocations(prev => prev.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400">
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <input value={loc.proxyPass || ""} onChange={e => {
                        const next = [...locations]; next[i] = { ...next[i], proxyPass: e.target.value || null }; setLocations(next);
                      }} className="w-full bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono text-gray-400 outline-none" placeholder="proxy_pass http://..." />
                      <input value={loc.root || ""} onChange={e => {
                        const next = [...locations]; next[i] = { ...next[i], root: e.target.value || null }; setLocations(next);
                      }} className="w-full bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono text-gray-400 outline-none" placeholder="root /var/www/..." />
                    </div>
                  ))}
                  <button onClick={() => setLocations(prev => [...prev, { path: "/new/", proxyPass: null, root: null, tryFiles: null, rewrite: null, headers: {} }])}
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
                    <Plus size={10} /> Add Location
                  </button>
                </div>
              )}
            </div>

            <div>
              <SectionHeader id="upstreams" title={`Upstreams (${upstreams.length})`} icon={Server} />
              {expandedSections.has("upstreams") && (
                <div className="px-4 py-2 space-y-2">
                  {upstreams.map((u, i) => (
                    <div key={i} className="bg-[#2a2d2e] rounded p-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input value={u.name} onChange={e => {
                          const next = [...upstreams]; next[i] = { ...next[i], name: e.target.value }; setUpstreams(next);
                        }} className="flex-1 bg-[#1e1e1e] px-2 py-1 rounded text-xs font-mono outline-none" placeholder="upstream name" />
                        <select value={u.method} onChange={e => {
                          const next = [...upstreams]; next[i] = { ...next[i], method: e.target.value as any }; setUpstreams(next);
                        }} className="bg-[#1e1e1e] px-1 py-1 rounded text-[10px] text-gray-400 outline-none">
                          <option value="round_robin">Round Robin</option>
                          <option value="least_conn">Least Connections</option>
                          <option value="ip_hash">IP Hash</option>
                        </select>
                      </div>
                      {u.servers.map((s, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <input value={s.address} onChange={e => {
                            const next = [...upstreams]; const ss = [...next[i].servers]; ss[j] = { ...ss[j], address: e.target.value }; next[i] = { ...next[i], servers: ss }; setUpstreams(next);
                          }} className="flex-1 bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono outline-none" placeholder="127.0.0.1:3000" />
                          <span className="text-[8px] text-gray-600">w:</span>
                          <input type="number" value={s.weight} min={1} onChange={e => {
                            const next = [...upstreams]; const ss = [...next[i].servers]; ss[j] = { ...ss[j], weight: +e.target.value }; next[i] = { ...next[i], servers: ss }; setUpstreams(next);
                          }} className="w-10 bg-[#1e1e1e] px-1 py-1 rounded text-[10px] text-center outline-none" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHeader id="security" title="Security Headers" icon={Shield} />
              {expandedSections.has("security") && (
                <div className="px-4 py-2 space-y-1.5">
                  {Object.entries(headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1">
                      <input value={key} readOnly className="w-36 bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono text-gray-500 outline-none" />
                      <input value={value} onChange={e => setHeaders(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono text-gray-400 outline-none" />
                      <button onClick={() => setHeaders(prev => { const n = { ...prev }; delete n[key]; return n; })}
                        className="text-gray-600 hover:text-red-400"><Trash2 size={8} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <textarea value={rawConfig} onChange={e => setRawConfig(e.target.value)} spellCheck={false}
            className="w-full h-full bg-[#1e1e1e] text-gray-200 font-mono text-xs p-4 outline-none resize-none leading-relaxed" />
        )}
      </div>
    </div>
  );
}
