import { useState, useEffect } from "react";
import { X, FileWarning, Save, Loader2, Eye, Code, ToggleLeft, ToggleRight, RefreshCw, Trash2 } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

interface Props { projectId: string; onClose: () => void; }

const STATUS_CODES = [
  { code: 404, label: "404 Not Found", color: "text-blue-400" },
  { code: 500, label: "500 Server Error", color: "text-red-400" },
  { code: 503, label: "503 Unavailable", color: "text-yellow-400" },
];

const TEMPLATES = ["minimal", "branded", "playful", "technical"];

function generatePreview(page: any): string {
  const bg = page.backgroundColor || "#0a0a0a";
  const fg = page.textColor || "#ffffff";
  const accent = page.accentColor || "#3b82f6";
  if (page.customHtml) {
    return `<html><head><style>body{margin:0;font-family:system-ui,sans-serif;background:${bg};color:${fg}}${page.customCss || ""}</style></head><body>${page.customHtml}</body></html>`;
  }
  const templateStyles: Record<string, string> = {
    minimal: `body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;background:${bg};color:${fg}}.c{text-align:center;max-width:480px;padding:2rem}.code{font-size:6rem;font-weight:800;color:${accent};line-height:1;margin-bottom:1rem}.title{font-size:1.5rem;font-weight:600;margin-bottom:.75rem}.msg{color:${fg}99;font-size:.875rem;line-height:1.6;margin-bottom:1.5rem}a{color:${accent};text-decoration:none;font-size:.875rem}a:hover{text-decoration:underline}`,
    branded: `body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;background:linear-gradient(135deg,${bg},${accent}22);color:${fg}}.c{text-align:center;max-width:520px;padding:2rem;background:${bg}dd;border-radius:1rem;border:1px solid ${accent}33;backdrop-filter:blur(10px)}.code{font-size:5rem;font-weight:800;background:linear-gradient(135deg,${accent},${fg});-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;margin-bottom:1rem}.title{font-size:1.5rem;font-weight:600;margin-bottom:.75rem}.msg{color:${fg}99;font-size:.875rem;line-height:1.6;margin-bottom:1.5rem}a{display:inline-block;padding:.5rem 1.5rem;background:${accent};color:#fff;border-radius:.5rem;text-decoration:none;font-size:.875rem}`,
    playful: `body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;background:${bg};color:${fg}}.c{text-align:center;max-width:480px;padding:2rem}.emoji{font-size:5rem;margin-bottom:1rem}.code{font-size:3rem;font-weight:800;color:${accent};margin-bottom:.5rem}.title{font-size:1.25rem;font-weight:600;margin-bottom:.75rem}.msg{color:${fg}99;font-size:.875rem;line-height:1.6;margin-bottom:1.5rem}a{color:${accent};text-decoration:none;font-size:.875rem;border:1px solid ${accent};padding:.4rem 1rem;border-radius:2rem}`,
    technical: `body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:'Courier New',monospace;background:${bg};color:${fg}}.c{max-width:560px;padding:2rem;border:1px solid ${accent}44;border-radius:.5rem;background:${bg}}.header{color:${accent};font-size:.75rem;margin-bottom:1rem;opacity:.7}pre{background:${fg}08;padding:1rem;border-radius:.25rem;font-size:.8rem;line-height:1.8;margin-bottom:1rem;overflow-x:auto;border:1px solid ${fg}11}a{color:${accent};font-size:.8rem}`,
  };
  const emojis: Record<number, string> = { 404: "🔍", 500: "💥", 503: "🔧" };
  const style = templateStyles[page.template] || templateStyles.minimal;
  let body = "";
  if (page.template === "technical") {
    body = `<div class="c"><div class="header">// Error Response</div><pre>{
  "status": ${page.statusCode},
  "error": "${page.title}",
  "message": "${page.message}",
  "timestamp": "${new Date().toISOString()}"
}</pre>${page.showBackLink ? '<a href="/">← Back to home</a>' : ""}${page.showContactLink && page.contactEmail ? ` | <a href="mailto:${page.contactEmail}">Contact support</a>` : ""}</div>`;
  } else {
    body = `<div class="c">${page.template === "playful" ? `<div class="emoji">${emojis[page.statusCode] || "⚠️"}</div>` : ""}${page.showStatusCode ? `<div class="code">${page.statusCode}</div>` : ""}<div class="title">${page.title}</div><div class="msg">${page.message}</div>${page.showBackLink ? `<a href="/">${page.template === "playful" ? "🏠 Take me home" : "← Back to home"}</a>` : ""}${page.showContactLink && page.contactEmail ? ` &nbsp;|&nbsp; <a href="mailto:${page.contactEmail}">Contact support</a>` : ""}</div>`;
  }
  return `<html><head><style>${style}${page.customCss || ""}</style></head><body>${body}</body></html>`;
}

export function ErrorPageEditor({ projectId, onClose }: Props) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCode, setSelectedCode] = useState(404);
  const [view, setView] = useState<"editor" | "code">("editor");
  const [editPage, setEditPage] = useState<any>(null);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/projects/${projectId}/error-pages`, { credentials: "include" });
      if (r.ok) { const data = await r.json(); setPages(data); selectPage(data, selectedCode); }
    } catch {} finally { setLoading(false); }
  };

  const selectPage = (list: any[], code: number) => {
    const p = list.find((pg: any) => pg.statusCode === code);
    if (p) setEditPage({ ...p });
    else setEditPage({
      statusCode: code, title: code === 404 ? "Page Not Found" : code === 500 ? "Internal Server Error" : "Service Unavailable",
      message: "An error occurred.", template: "minimal", customHtml: null, customCss: null,
      showBackLink: true, showStatusCode: true, showContactLink: false, contactEmail: null,
      backgroundColor: "#0a0a0a", textColor: "#ffffff", accentColor: code === 404 ? "#3b82f6" : code === 500 ? "#ef4444" : "#f59e0b", enabled: true,
    });
  };

  const save = async () => {
    if (!editPage) return;
    setSaving(true);
    try {
      await fetch(`${API}/projects/${projectId}/error-pages`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPage), credentials: "include",
      });
      load();
    } catch {} finally { setSaving(false); }
  };

  const update = (key: string, value: any) => setEditPage((p: any) => p ? { ...p, [key]: value } : p);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="error-page-editor">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <FileWarning className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Error Pages</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={save} disabled={saving} className="flex items-center gap-1 px-2 py-0.5 text-[9px] bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save
          </button>
          <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex">
        <div className="w-56 border-r border-border/30 overflow-y-auto p-3 space-y-3 shrink-0">
          <div className="space-y-1">
            {STATUS_CODES.map(sc => (
              <button key={sc.code} onClick={() => { setSelectedCode(sc.code); selectPage(pages, sc.code); }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] flex items-center justify-between ${selectedCode === sc.code ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground"}`}>
                <span className={sc.color}>{sc.label}</span>
                {pages.find(p => p.statusCode === sc.code)?.enabled && <div className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </button>
            ))}
          </div>
          {editPage && (
            <>
              <div className="space-y-2">
                <div className="text-[9px] font-medium text-muted-foreground">Template</div>
                <div className="grid grid-cols-2 gap-1">
                  {TEMPLATES.map(t => (
                    <button key={t} onClick={() => update("template", t)} className={`px-2 py-1 text-[8px] rounded capitalize ${editPage.template === t ? "bg-primary/10 text-primary" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-muted-foreground">Title</label>
                <input value={editPage.title} onChange={e => update("title", e.target.value)} className="w-full px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" />
                <label className="text-[9px] text-muted-foreground">Message</label>
                <textarea value={editPage.message} onChange={e => update("message", e.target.value)} className="w-full px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded resize-none h-14" />
                <label className="text-[9px] text-muted-foreground">Contact Email</label>
                <input value={editPage.contactEmail || ""} onChange={e => update("contactEmail", e.target.value || null)} className="w-full px-2 py-1 text-[10px] bg-muted/30 border border-border/30 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="text-[9px] font-medium text-muted-foreground">Colors</div>
                {([["Background", "backgroundColor"], ["Text", "textColor"], ["Accent", "accentColor"]] as const).map(([label, key]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input type="color" value={editPage[key]} onChange={e => update(key, e.target.value)} className="w-5 h-5 rounded border border-border/30 cursor-pointer p-0" />
                    <span className="text-[8px] text-muted-foreground flex-1">{label}</span>
                    <input value={editPage[key]} onChange={e => update(key, e.target.value)} className="w-16 px-1 py-0.5 text-[8px] font-mono bg-muted/20 border border-border/20 rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="text-[9px] font-medium text-muted-foreground">Options</div>
                {([["Show Status Code", "showStatusCode"], ["Show Back Link", "showBackLink"], ["Show Contact Link", "showContactLink"], ["Enabled", "enabled"]] as const).map(([label, key]) => (
                  <button key={key} onClick={() => update(key, !editPage[key])} className="w-full flex items-center justify-between py-0.5">
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                    {editPage[key] ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 shrink-0">
            <button onClick={() => setView("editor")} className={`flex items-center gap-1 px-2 py-0.5 text-[9px] rounded ${view === "editor" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}><Eye className="w-3 h-3" />Preview</button>
            <button onClick={() => setView("code")} className={`flex items-center gap-1 px-2 py-0.5 text-[9px] rounded ${view === "code" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}><Code className="w-3 h-3" />HTML</button>
          </div>
          <div className="flex-1 overflow-hidden">
            {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin" /></div> : editPage && (
              view === "editor" ? (
                <iframe srcDoc={generatePreview(editPage)} className="w-full h-full border-0" sandbox="allow-same-origin" title="Error page preview" />
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <label className="text-[9px] text-muted-foreground">Custom HTML (replaces template body)</label>
                    <textarea value={editPage.customHtml || ""} onChange={e => update("customHtml", e.target.value || null)} placeholder="<div>Your custom error page HTML...</div>" className="w-full px-2 py-1.5 text-[10px] font-mono bg-muted/30 border border-border/30 rounded resize-none h-32" />
                    <label className="text-[9px] text-muted-foreground">Custom CSS (appended to styles)</label>
                    <textarea value={editPage.customCss || ""} onChange={e => update("customCss", e.target.value || null)} placeholder=".custom-class { color: red; }" className="w-full px-2 py-1.5 text-[10px] font-mono bg-muted/30 border border-border/30 rounded resize-none h-24" />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
