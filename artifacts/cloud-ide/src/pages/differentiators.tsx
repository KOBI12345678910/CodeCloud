import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Eye, Mic, Image as ImageIcon, Users, Clock, FlaskConical, FileText,
  Shield, Gauge, DollarSign, Cloud, Database, Store, GraduationCap,
  WifiOff, Key, Palette, ScrollText, Smartphone, Bot, Loader2, Check,
  X, Play, Plus, Trash2, RefreshCw,
} from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api/differentiators`;

const TABS = [
  { id: "diff", label: "Visual Diff", icon: Eye, phase: "A" },
  { id: "voice", label: "Voice → Code", icon: Mic, phase: "A" },
  { id: "screen", label: "Screen → Code", icon: ImageIcon, phase: "A" },
  { id: "collab", label: "Collaboration+", icon: Users, phase: "A" },
  { id: "time", label: "Time Machine", icon: Clock, phase: "A" },
  { id: "tests", label: "Auto-Testing", icon: FlaskConical, phase: "B" },
  { id: "docs", label: "Auto-Docs", icon: FileText, phase: "B" },
  { id: "secscan", label: "Security Scanner", icon: Shield, phase: "B" },
  { id: "perf", label: "Perf Profiler", icon: Gauge, phase: "B" },
  { id: "cost", label: "Cost Optimizer", icon: DollarSign, phase: "B" },
  { id: "cloud", label: "Multi-Cloud", icon: Cloud, phase: "C" },
  { id: "dbai", label: "DB Assistant", icon: Database, phase: "C" },
  { id: "market", label: "Marketplace", icon: Store, phase: "C" },
  { id: "learn", label: "Learning Mode", icon: GraduationCap, phase: "C" },
  { id: "offline", label: "Offline Mode", icon: WifiOff, phase: "C" },
  { id: "byok", label: "BYOK", icon: Key, phase: "D" },
  { id: "white", label: "White-Label", icon: Palette, phase: "D" },
  { id: "comp", label: "Compliance", icon: ScrollText, phase: "D" },
  { id: "mobile", label: "Mobile Builder", icon: Smartphone, phase: "D" },
  { id: "agents", label: "Agents Market", icon: Bot, phase: "D" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { credentials: "include" });
  return r.json();
}
async function jpost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function jput<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function jdel<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, { method: "DELETE", credentials: "include" });
  return r.json();
}

// ---------------------------------------------------------------- Visual Diff
function VisualDiffPanel() {
  const [before, setBefore] = useState("function add(a, b) {\n  return a + b;\n}");
  const [after, setAfter] = useState("export function add(a: number, b: number): number {\n  return a + b;\n}");
  const [filePath, setFilePath] = useState("src/lib/math.ts");
  const [session, setSession] = useState<any>(null);
  const [merged, setMerged] = useState<string | null>(null);

  const create = async () => {
    setMerged(null);
    setSession(await jpost("/diff/sessions", { filePath, before, after }));
  };
  const decide = async (hid: string, action: "accept" | "reject") => {
    setSession(await jpost(`/diff/sessions/${session.id}/hunks/${hid}`, { action }));
  };
  const apply = async () => {
    const r = await jpost<{ content: string }>(`/diff/sessions/${session.id}/apply`, {});
    setMerged(r.content);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input value={filePath} onChange={(e) => setFilePath(e.target.value)} placeholder="File path" className="h-8 text-xs" data-testid="diff-path" />
        <Button size="sm" onClick={create} className="h-8 text-xs" data-testid="diff-create"><Eye className="w-3 h-3 mr-1" /> Create diff session</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <textarea value={before} onChange={(e) => setBefore(e.target.value)} className="h-32 bg-card border border-border rounded p-2 text-[11px] font-mono" />
        <textarea value={after} onChange={(e) => setAfter(e.target.value)} className="h-32 bg-card border border-border rounded p-2 text-[11px] font-mono" />
      </div>
      {session && (
        <div className="space-y-2">
          <div className="text-[11px] text-muted-foreground">Session {session.id} · {session.hunks.length} hunk(s)</div>
          {session.hunks.map((h: any) => (
            <div key={h.id} className="border border-border rounded">
              <div className="flex items-center justify-between px-2 py-1 bg-muted/30 text-[10px]">
                <span>Lines {h.startA + 1}–{h.startA + h.before.length}</span>
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded ${h.status === "accepted" ? "bg-green-500/20 text-green-400" : h.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{h.status}</span>
                  <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={() => decide(h.id, "accept")}><Check className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={() => decide(h.id, "reject")}><X className="w-3 h-3" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border text-[10px] font-mono">
                <pre className="bg-red-500/5 p-2 whitespace-pre-wrap">{h.before.join("\n")}</pre>
                <pre className="bg-green-500/5 p-2 whitespace-pre-wrap">{h.after.join("\n")}</pre>
              </div>
            </div>
          ))}
          <Button size="sm" onClick={apply} className="h-7 text-xs"><Check className="w-3 h-3 mr-1" /> Apply selected</Button>
          {merged !== null && (
            <pre className="bg-muted/30 border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap">{merged}</pre>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Voice
function VoicePanel() {
  const [hint, setHint] = useState("");
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [locale, setLocale] = useState("en");

  useEffect(() => { jget<any[]>("/voice/transcribe").then(setHistory); }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const buf: Blob[] = [];
      rec.ondataavailable = (e) => buf.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(buf, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = String(reader.result || "").split(",")[1] || "";
          const r = await jpost("/voice/transcribe", { audioBase64: b64, hint, locale });
          setTranscript(r);
          setHistory(await jget("/voice/transcribe"));
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      setRecorder(rec);
      setChunks(buf);
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };
  const stop = () => { recorder?.stop(); setRecording(false); };

  const submitHint = async () => {
    if (!hint.trim()) return;
    const r = await jpost("/voice/transcribe", { hint, locale });
    setTranscript(r);
    setHistory(await jget("/voice/transcribe"));
    setHint("");
  };

  return (
    <div className="space-y-3">
      <Section title="Hold-to-talk">
        <div className="flex items-center gap-2">
          <Button onMouseDown={start} onMouseUp={stop} onMouseLeave={() => recording && stop()} size="sm" className="h-9 text-xs" data-testid="voice-record">
            <Mic className={`w-3 h-3 mr-1 ${recording ? "text-red-400 animate-pulse" : ""}`} /> {recording ? "Recording…" : "Hold to record"}
          </Button>
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className="bg-card border border-border rounded px-2 py-1 text-xs">
            {["en", "es", "fr", "de", "ja", "zh", "pt", "ar", "hi", "ru"].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </Section>
      <Section title="Or type a hint and submit">
        <div className="flex items-center gap-2">
          <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. Make the navbar sticky" className="h-8 text-xs flex-1" />
          <Button size="sm" onClick={submitHint} className="h-8 text-xs">Submit</Button>
        </div>
      </Section>
      {transcript && (
        <div className="bg-card border border-border rounded p-2 text-xs">
          <div className="text-muted-foreground text-[10px]">Latest ({transcript.locale}, {transcript.bytes}B, {transcript.source})</div>
          <div className="font-medium">{transcript.transcript}</div>
        </div>
      )}
      <Section title={`Recent (${history.length})`}>
        <div className="space-y-1 max-h-48 overflow-auto">
          {history.slice(0, 10).map((h: any) => (
            <div key={h.id} className="text-[11px] flex items-center gap-2 border-b border-border/30 py-1">
              <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleTimeString()}</span>
              <span className="font-mono text-[10px] uppercase text-primary">{h.locale}</span>
              <span className="flex-1 truncate">{h.transcript}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Screen-to-Code
function ScreenToCodePanel() {
  const [hint, setHint] = useState("Pricing card with three tiers");
  const [framework, setFramework] = useState("react");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<any>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(String(reader.result || "").split(",")[1] || null);
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    const r = await jpost("/screen-to-code", { imageBase64, sourceUrl: sourceUrl || undefined, hint, framework });
    setResult(r);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <input type="file" accept="image/*" onChange={onFile} className="text-xs" data-testid="s2c-file" />
        <Input placeholder="Or Figma URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="h-8 text-xs" />
        <select value={framework} onChange={(e) => setFramework(e.target.value)} className="bg-card border border-border rounded text-xs px-2 py-1">
          <option value="react">React (TSX)</option>
          <option value="vue">Vue</option>
          <option value="svelte">Svelte</option>
        </select>
      </div>
      <Input placeholder="Description / hint" value={hint} onChange={(e) => setHint(e.target.value)} className="h-8 text-xs" />
      <Button size="sm" onClick={generate} disabled={!imageBase64 && !sourceUrl} className="h-8 text-xs"><ImageIcon className="w-3 h-3 mr-1" /> Generate component</Button>
      {result && (
        <div className="space-y-2">
          <div className="text-[11px] text-muted-foreground">Generated <span className="font-mono">{result.filePath}</span> · opened in diff session <span className="font-mono">{result.diffSessionId}</span></div>
          <pre className="bg-muted/30 border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap max-h-72 overflow-auto">{result.code}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Collab
function CollabPanel() {
  const [room, setRoom] = useState("project-demo");
  const [me, setMe] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const refresh = async () => setParticipants(await jget(`/collab/${encodeURIComponent(room)}`));
  useEffect(() => { refresh(); const t = setInterval(refresh, 2000); return () => clearInterval(t); }, [room]);

  const join = async (asAgent: boolean) => {
    const p = await jpost(`/collab/${encodeURIComponent(room)}/join`, { name: asAgent ? "Agent" : "You", isAgent: asAgent });
    if (!asAgent) setMe(p);
    refresh();
  };
  const ping = async () => {
    if (!me) return;
    await jpost(`/collab/${encodeURIComponent(room)}/cursor`, { participantId: me.id, cursor: { file: "src/index.ts", line: Math.floor(Math.random() * 200), column: Math.floor(Math.random() * 80) } });
    refresh();
  };
  const leave = async () => {
    if (!me) return;
    await jpost(`/collab/${encodeURIComponent(room)}/leave`, { participantId: me.id });
    setMe(null);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={room} onChange={(e) => setRoom(e.target.value)} className="h-8 text-xs flex-1" />
        <Button size="sm" onClick={() => join(false)} className="h-8 text-xs">Join</Button>
        <Button size="sm" variant="outline" onClick={() => join(true)} className="h-8 text-xs">Add agent cursor</Button>
        {me && <Button size="sm" variant="outline" onClick={leave} className="h-8 text-xs">Leave</Button>}
      </div>
      {me && <Button size="sm" onClick={ping} className="h-7 text-xs">Send cursor ping</Button>}
      <div className="space-y-1">
        {participants.length === 0 && <div className="text-[11px] text-muted-foreground">No live participants</div>}
        {participants.map((p) => (
          <div key={p.id} className="flex items-center gap-2 border border-border rounded p-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="font-medium flex-1">{p.name} {p.isAgent && <span className="text-[10px] text-purple-400">[agent]</span>}</span>
            {p.cursor && <span className="font-mono text-[10px] text-muted-foreground">{p.cursor.file}:{p.cursor.line}:{p.cursor.column}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Time Machine
function TimeMachinePanel() {
  const [projectId, setProjectId] = useState("demo");
  const [label, setLabel] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [restored, setRestored] = useState<any>(null);

  const refresh = async () => setList(await jget(`/timemachine/${projectId}/checkpoints`));
  useEffect(() => { refresh(); }, [projectId]);

  const create = async () => {
    await jpost(`/timemachine/${projectId}/checkpoint`, {
      label: label || undefined,
      files: [{ path: "README.md", content: `# Project at ${new Date().toISOString()}` }],
      schema: { tables: [{ name: "users", columns: [{ name: "id", type: "uuid" }] }] },
    });
    setLabel("");
    refresh();
  };
  const restore = async (id: string) => {
    const r = await jpost(`/timemachine/${projectId}/restore/${id}`, { currentFiles: [{ path: "README.md", content: "# Current state" }] });
    setRestored(r);
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 text-xs w-32" placeholder="projectId" />
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs flex-1" placeholder="Label (optional)" />
        <Button size="sm" onClick={create} className="h-8 text-xs"><Plus className="w-3 h-3 mr-1" /> Snapshot now</Button>
      </div>
      <div className="border-l-2 border-primary/30 pl-3 space-y-2 max-h-80 overflow-auto">
        {list.map((c: any) => (
          <div key={c.id} className="relative">
            <div className="absolute -left-[15px] top-1.5 w-2 h-2 rounded-full bg-primary" />
            <div className="bg-card border border-border rounded p-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()} · {c.files.length} files · {c.schema.tables.length} tables</div>
                </div>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => restore(c.id)}>Restore</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {restored && <div className="text-[11px] text-green-400">Restored {restored.restored.label} (undo: {restored.undoCheckpointId})</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Auto-Test
function AutoTestPanel() {
  const [filePath, setFilePath] = useState("src/lib/math.ts");
  const [source, setSource] = useState("export function add(a: number, b: number) { return a + b; }\nexport function mul(a: number, b: number) { return a * b; }");
  const [kind, setKind] = useState<"unit" | "e2e">("unit");
  const [run, setRun] = useState<any>(null);

  const generate = async () => setRun(await jpost("/autotest/generate", { filePath, source, kind }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={filePath} onChange={(e) => setFilePath(e.target.value)} className="h-8 text-xs flex-1" />
        <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="bg-card border border-border rounded text-xs px-2 py-1">
          <option value="unit">Vitest unit</option>
          <option value="e2e">Playwright e2e</option>
        </select>
        <Button size="sm" onClick={generate} className="h-8 text-xs"><FlaskConical className="w-3 h-3 mr-1" /> Generate & run</Button>
      </div>
      <textarea value={source} onChange={(e) => setSource(e.target.value)} className="w-full h-28 bg-card border border-border rounded p-2 text-[11px] font-mono" />
      {run && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Card className="p-2"><div className="text-[10px] text-muted-foreground">Tests passed</div><div className="text-lg font-bold text-green-400">{run.passed}</div></Card>
            <Card className="p-2"><div className="text-[10px] text-muted-foreground">Failed</div><div className="text-lg font-bold text-red-400">{run.failed}</div></Card>
            <Card className="p-2"><div className="text-[10px] text-muted-foreground">Coverage</div><div className="text-lg font-bold">{(run.coverage.before * 100).toFixed(0)}% → {(run.coverage.after * 100).toFixed(0)}%</div></Card>
          </div>
          <div className="text-[11px] text-muted-foreground">Generated <span className="font-mono">{run.testPath}</span></div>
          <pre className="bg-muted/30 border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap max-h-72 overflow-auto">{run.code}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Auto-Docs
function AutoDocsPanel() {
  const [projectId, setProjectId] = useState("demo");
  const [doc, setDoc] = useState<any>(null);

  const generate = async () => {
    const r = await jpost("/autodoc/generate", {
      projectId,
      modules: [
        { path: "src/lib/math.ts", exports: ["add", "mul"], description: "Pure math helpers." },
        { path: "src/api/users.ts", exports: ["list", "create"], description: "User CRUD." },
      ],
      routes: [
        { method: "GET", path: "/api/users", description: "List users" },
        { method: "POST", path: "/api/users", description: "Create user" },
      ],
    });
    setDoc(r);
  };
  const load = async () => setDoc(await jget(`/autodoc/${projectId}`));
  useEffect(() => { load(); }, [projectId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 text-xs w-40" />
        <Button size="sm" onClick={generate} className="h-8 text-xs"><RefreshCw className="w-3 h-3 mr-1" /> Regenerate</Button>
      </div>
      {doc ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">README</div>
            <pre className="bg-muted/30 border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap max-h-72 overflow-auto">{doc.readme}</pre>
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">OpenAPI</div>
            <pre className="bg-muted/30 border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap max-h-72 overflow-auto">{JSON.stringify(doc.openapi, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground">No docs yet — click Regenerate.</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- SecScan
function SecScanPanel() {
  const [projectId, setProjectId] = useState("demo");
  const [report, setReport] = useState<any>(null);

  const run = async () => {
    const r = await jpost("/secscan/run", {
      projectId,
      deps: [
        { name: "left-pad", version: "0.1.2" },
        { name: "react", version: "19.0.0" },
        { name: "express", version: "5.0.0-beta.1" },
      ],
      source: [
        { path: "src/eval-bad.ts", content: `function run(s: string) { return eval(s); }\nconst KEY = "sk-aaaaaaaaaaaaaaaaaaaaaaaaaa";\n` },
        { path: "src/clean.ts", content: `export const ok = 1;` },
      ],
    });
    setReport(r);
  };

  const fix = async (findingId: string) => {
    await jpost(`/secscan/fix/${findingId}`, { source: "// existing source" });
    alert("Fix opened in Visual Diff Preview tab.");
  };

  const sevColor = (s: string) =>
    s === "critical" ? "bg-red-500/20 text-red-400" : s === "high" ? "bg-orange-500/20 text-orange-400" : s === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 text-xs w-40" />
        <Button size="sm" onClick={run} className="h-8 text-xs"><Shield className="w-3 h-3 mr-1" /> Scan</Button>
      </div>
      {report && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs">
            {(["critical", "high", "medium", "low"] as const).map((k) => (
              <Card key={k} className="p-2"><div className="text-[10px] text-muted-foreground capitalize">{k}</div><div className="text-lg font-bold">{report.counts[k]}</div></Card>
            ))}
          </div>
          {report.findings.map((f: any) => (
            <div key={f.id} className="border border-border rounded p-2 text-xs flex items-start gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${sevColor(f.severity)}`}>{f.severity}</span>
              <div className="flex-1">
                <div className="font-medium">{f.title}</div>
                {f.file && <div className="text-[10px] text-muted-foreground font-mono">{f.file}:{f.line}</div>}
                {f.fix && <div className="text-[10px] text-muted-foreground mt-0.5">Fix: {f.fix}</div>}
              </div>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => fix(f.id)}>Fix with AI</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Perf
function PerfPanel() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    setReport(await jpost("/perf/profile", { projectId: "demo", durationSec: 5 }));
    setLoading(false);
  };
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={run} disabled={loading} className="h-8 text-xs">{loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />} Profile (5s)</Button>
      {report && (
        <div className="space-y-3">
          <Section title="Flame graph (top frames)">
            <div className="space-y-1">
              {report.flame.map((f: any) => (
                <div key={f.fn} className="flex items-center gap-2 text-xs">
                  <span className="w-32 font-mono truncate">{f.fn}</span>
                  <div className="flex-1 h-3 bg-muted rounded">
                    <div className="h-3 bg-orange-500 rounded" style={{ width: `${Math.min(100, f.selfMs / 8)}%` }} />
                  </div>
                  <span className="w-14 text-right font-mono text-[11px]">{f.selfMs}ms</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Slow queries">
            {report.slowQueries.map((q: any, i: number) => (
              <div key={i} className="border border-border rounded p-2 text-xs">
                <div className="font-mono text-[11px]">{q.sql}</div>
                <div className="text-[10px] text-muted-foreground">{q.ms}ms · {q.suggestion}</div>
              </div>
            ))}
          </Section>
          <Section title="AI suggestions">
            {report.suggestions.map((s: any) => (
              <div key={s.target} className="text-[11px]">→ <span className="font-mono">{s.target}</span> {s.hint}</div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Cost
function CostPanel() {
  const [report, setReport] = useState<any>(null);
  const generate = async () => setReport(await jpost("/cost-opt/report", { projectId: "demo" }));
  const apply = async (rid: string) => setReport(await jpost(`/cost-opt/apply/${report.id}/${rid}`, {}));

  return (
    <div className="space-y-3">
      <Button size="sm" onClick={generate} className="h-8 text-xs"><DollarSign className="w-3 h-3 mr-1" /> Generate weekly report</Button>
      {report && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2"><div className="text-[10px] text-muted-foreground">Cloud</div><div className="text-lg font-bold">${report.spend.cloudUsd.toFixed(2)}</div></Card>
            <Card className="p-2"><div className="text-[10px] text-muted-foreground">AI</div><div className="text-lg font-bold">${report.spend.aiUsd.toFixed(2)}</div></Card>
            <Card className="p-2"><div className="text-[10px] text-muted-foreground">Total</div><div className="text-lg font-bold text-primary">${report.spend.totalUsd.toFixed(2)}</div></Card>
          </div>
          {report.recommendations.map((r: any) => {
            const applied = report.appliedIds?.includes(r.id);
            return (
              <div key={r.id} className="border border-border rounded p-2 text-xs flex items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground">Save ~${r.savingsUsd}/wk · risk {r.risk} {r.autoApply && "· auto-applicable"}</div>
                </div>
                {r.autoApply && (applied ? <span className="text-[10px] text-green-400">applied ✓</span> : <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => apply(r.id)}>Apply</Button>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Multi-Cloud
function CloudPanel() {
  const [targets, setTargets] = useState<string[]>(["vercel", "cloudflare", "aws"]);
  const [autoPick, setAutoPick] = useState<"" | "cheapest" | "fastest">("");
  const [deploy, setDeploy] = useState<any>(null);
  const ALL = ["vercel", "netlify", "cloudflare", "aws", "gcp"];

  const toggle = (t: string) => setTargets((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const run = async () => {
    const r = await jpost<any>("/multicloud/deploy", { projectId: "demo", targets, autoPick: autoPick || null });
    setDeploy(r);
    const tick = setInterval(async () => {
      const fresh = await jget<any>(`/multicloud/${r.id}`);
      setDeploy(fresh);
      if (fresh.targets.every((t: any) => t.status === "live" || t.status === "failed")) clearInterval(tick);
    }, 800);
  };

  return (
    <div className="space-y-3">
      <Section title="Targets">
        <div className="flex flex-wrap gap-1">
          {ALL.map((t) => (
            <button key={t} onClick={() => toggle(t)} className={`px-2 py-1 rounded text-[11px] border ${targets.includes(t) ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>{t}</button>
          ))}
        </div>
      </Section>
      <Section title="Auto-pick">
        <div className="flex items-center gap-2">
          {(["", "cheapest", "fastest"] as const).map((m) => (
            <button key={m || "off"} onClick={() => setAutoPick(m)} className={`px-2 py-1 rounded text-[11px] border ${autoPick === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>{m || "off"}</button>
          ))}
          <Button size="sm" onClick={run} className="h-7 text-xs ml-auto"><Cloud className="w-3 h-3 mr-1" /> Deploy</Button>
        </div>
      </Section>
      {deploy && (
        <div className="space-y-1">
          {deploy.targets.map((t: any) => (
            <div key={t.target} className="border border-border rounded p-2 text-xs flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${t.status === "live" ? "bg-green-500" : t.status === "building" ? "bg-yellow-500 animate-pulse" : t.status === "failed" ? "bg-red-500" : "bg-muted-foreground"}`} />
              <span className="w-24 font-medium">{t.target}</span>
              <span className="w-20 text-[10px] text-muted-foreground">{t.status}</span>
              <span className="flex-1 truncate font-mono text-[10px]">{t.url}</span>
              <span className="text-[10px] text-muted-foreground">${t.pricing.perMonthUsd}/mo · {t.pricing.coldStartMs}ms cold</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- DB AI
function DbAiPanel() {
  const [question, setQuestion] = useState("How many users signed up this week?");
  const [result, setResult] = useState<any>(null);
  const [migration, setMigration] = useState<any>(null);
  const SCHEMA = { tables: [{ name: "users", columns: [{ name: "id", type: "uuid" }, { name: "created_at", type: "timestamptz" }, { name: "email", type: "text" }] }] };
  const ask = async () => setResult(await jpost("/db-ai/ask", { question, schema: SCHEMA }));
  const plan = async () => {
    const r = await jpost("/db-ai/migration-plan", {
      current: SCHEMA,
      desired: { tables: [...SCHEMA.tables, { name: "orders", columns: [{ name: "id", type: "uuid" }, { name: "user_id", type: "uuid" }, { name: "amount_cents", type: "integer" }] }] },
    });
    setMigration(r);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} className="h-8 text-xs flex-1" placeholder="Ask about your schema or data" />
        <Button size="sm" onClick={ask} className="h-8 text-xs">Ask</Button>
        <Button size="sm" variant="outline" onClick={plan} className="h-8 text-xs">Migration plan</Button>
      </div>
      {result && (
        <div className="space-y-2">
          <pre className="bg-muted/30 border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap">{result.sql}</pre>
          <Section title="Query plan">
            <div className="text-[11px] font-mono space-y-0.5">
              {result.plan.map((p: any, i: number) => <div key={i}>→ {p.node} cost={p.cost} rows={p.rows}</div>)}
            </div>
          </Section>
          {result.indexHints?.length > 0 && (
            <Section title="Index suggestions">
              {result.indexHints.map((h: any, i: number) => (
                <div key={i} className="border border-border rounded p-2 text-[11px]">
                  <div className="font-mono">{h.ddl}</div>
                  <div className="text-[10px] text-muted-foreground">~{h.estimatedSizeKb}KB · {h.latencyDeltaMs}ms latency change</div>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
      {migration && (
        <Section title="Migration steps">
          {migration.steps.map((s: any, i: number) => (
            <div key={i} className="border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap">{s.sql}</div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Marketplace
function MarketplacePanel() {
  const [listings, setListings] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState({ title: "", description: "", priceCredits: 50, kind: "template", license: "MIT", authorName: "you" });

  const refresh = async () => {
    setListings(await jget("/marketplace/listings"));
    setPayouts(await jget("/marketplace/payouts"));
  };
  useEffect(() => { refresh(); }, []);

  const publish = async () => {
    if (!draft.title) return;
    await jpost("/marketplace/listings", draft);
    setDraft({ ...draft, title: "" });
    refresh();
  };
  const buy = async (id: string) => { await jpost(`/marketplace/listings/${id}/buy`, {}); refresh(); };
  const rate = async (id: string, stars: number) => { await jpost(`/marketplace/listings/${id}/rate`, { stars }); refresh(); };
  const cashout = async () => { await jpost(`/marketplace/payouts/cashout`, { stripeAcct: "acct_1demo" }); refresh(); };

  const avg = (rs: number[]) => (rs.length ? (rs.reduce((s, x) => s + x, 0) / rs.length).toFixed(1) : "—");

  return (
    <div className="space-y-3">
      <Section title="Publish">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="h-8 text-xs" />
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="bg-card border border-border rounded text-xs px-2">
            <option value="template">Template</option>
            <option value="component">Component</option>
          </select>
          <Input placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="h-8 text-xs" />
          <Input type="number" placeholder="Price credits" value={draft.priceCredits} onChange={(e) => setDraft({ ...draft, priceCredits: Number(e.target.value) })} className="h-8 text-xs" />
        </div>
        <Button size="sm" onClick={publish} className="h-7 text-xs mt-2"><Plus className="w-3 h-3 mr-1" /> Publish listing</Button>
      </Section>
      <Section title={`Listings (${listings.length})`}>
        <div className="space-y-1 max-h-72 overflow-auto">
          {listings.map((l: any) => (
            <div key={l.id} className="border border-border rounded p-2 text-xs flex items-center gap-2">
              <div className="flex-1">
                <div className="font-medium">{l.title} <span className="text-[10px] text-muted-foreground">[{l.kind}] v{l.versions[l.versions.length - 1].v}</span></div>
                <div className="text-[10px] text-muted-foreground">{l.description} · ⭐ {avg(l.ratings)} · by {l.authorName} · {l.license}</div>
              </div>
              <span className="text-[11px] font-bold">{l.priceCredits}cr</span>
              <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => buy(l.id)}>Buy</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => rate(l.id, 5)}>★5</Button>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Payouts ledger (70% to seller)">
        <div className="space-y-1">
          {Object.entries(payouts).map(([owner, amt]) => (
            <div key={owner} className="flex items-center gap-2 text-xs">
              <span className="font-mono flex-1">{owner}</span>
              <span className="font-bold">{amt} cr</span>
              {amt > 0 && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={cashout}>Cash out via Stripe Connect</Button>}
            </div>
          ))}
          {Object.keys(payouts).length === 0 && <div className="text-[11px] text-muted-foreground">No payouts pending</div>}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- Learning
function LearningPanel() {
  const [source, setSource] = useState("import { useState } from 'react';\nexport function Counter() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>{n}</button>;\n}");
  const [data, setData] = useState<any>(null);
  const annotate = async () => setData(await jpost("/learning/annotate", { source, language: "tsx" }));

  return (
    <div className="space-y-3">
      <textarea value={source} onChange={(e) => setSource(e.target.value)} className="w-full h-32 bg-card border border-border rounded p-2 text-[11px] font-mono" />
      <Button size="sm" onClick={annotate} className="h-8 text-xs"><GraduationCap className="w-3 h-3 mr-1" /> Toggle Learning Mode</Button>
      {data && (
        <div className="grid grid-cols-2 gap-2">
          <Section title="Annotated">
            <div className="border border-border rounded text-[11px] font-mono divide-y divide-border max-h-72 overflow-auto">
              {data.annotations.map((a: any) => (
                <div key={a.line} className="grid grid-cols-[2rem_1fr_1fr] gap-2 p-1">
                  <span className="text-muted-foreground text-right pr-1">{a.line}</span>
                  <pre className="whitespace-pre-wrap">{a.code || " "}</pre>
                  <span className="text-[10px] text-primary/80">{a.note}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Tutorial">
            <div className="space-y-1">
              {data.tutorial.steps.map((s: any) => (
                <div key={s.step} className="border border-border rounded p-2 text-[11px]">
                  <div className="font-medium">Step {s.step}: {s.goal}</div>
                  <div className="text-[10px] text-muted-foreground">{s.checkpoint}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Offline
function OfflinePanel() {
  const [state, setState] = useState<any>(null);
  const refresh = async () => setState(await jget("/offline/status"));
  useEffect(() => { refresh(); }, []);
  const toggle = async () => setState(await jpost("/offline/toggle", { online: !state?.online }));
  const queue = async () => setState(await jpost("/offline/queue", { action: "agent.suggest", payload: { prompt: "Refactor home" } }));
  const flush = async () => setState(await jpost("/offline/flush", {}));

  if (!state) return <div className="text-[11px] text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-3">
      <div className={`p-3 rounded border ${state.online ? "border-green-500/30 bg-green-500/5" : "border-orange-500/30 bg-orange-500/5"}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${state.online ? "bg-green-500" : "bg-orange-500"}`} />
          <span className="font-medium text-sm">{state.online ? "Online" : "Offline mode"}</span>
          <span className="text-[10px] text-muted-foreground ml-auto font-mono">active model: {state.activeModel}</span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">Cloud: {state.cloudModel} · Local: {state.localModel}</div>
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" onClick={toggle} className="h-7 text-xs">{state.online ? "Go offline" : "Go online"}</Button>
          <Button size="sm" variant="outline" onClick={queue} className="h-7 text-xs">Queue cloud action</Button>
          <Button size="sm" variant="outline" onClick={flush} className="h-7 text-xs">Flush queue</Button>
        </div>
      </div>
      <Section title={`Queued (${state.queue.length})`}>
        <div className="space-y-1 max-h-32 overflow-auto">
          {state.queue.map((q: any) => (
            <div key={q.id} className="text-[11px] flex items-center gap-2 border-b border-border/30 py-1">
              <span className="font-mono text-primary">{q.action}</span>
              <span className="flex-1 text-muted-foreground truncate">{JSON.stringify(q.payload)}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(q.queuedAt).toLocaleTimeString()}</span>
            </div>
          ))}
          {state.queue.length === 0 && <div className="text-[11px] text-muted-foreground">Nothing queued.</div>}
        </div>
      </Section>
      <Section title="History">
        <div className="text-[10px] text-muted-foreground space-y-0.5 max-h-24 overflow-auto">
          {state.history.map((h: any, i: number) => <div key={i}>{new Date(h.at).toLocaleTimeString()} — {h.event}</div>)}
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- BYOK
function ByokPanel() {
  const [projectId, setProjectId] = useState("demo");
  const [keys, setKeys] = useState<any[]>([]);
  const [draft, setDraft] = useState({ provider: "openai", label: "Personal", secret: "" });
  const [redactInput, setRedactInput] = useState("My key is sk-aaaaaaaaaaaaaaaaaaaaaaaaaaaa and AKIA1234567890ABCDEF");
  const [redacted, setRedacted] = useState("");

  const refresh = async () => setKeys(await jget(`/byok/${projectId}/keys`));
  useEffect(() => { refresh(); }, [projectId]);

  const save = async () => {
    if (!draft.secret) return;
    await jpost(`/byok/${projectId}/keys`, draft);
    setDraft({ ...draft, secret: "" });
    refresh();
  };
  const remove = async (id: string) => { await jdel(`/byok/${projectId}/keys/${id}`); refresh(); };
  const incUsage = async (id: string) => { await jpost(`/byok/${projectId}/usage/${id}`, { calls: 1, tokens: 1500, usd: 0.03 }); refresh(); };
  const redactNow = async () => setRedacted((await jpost<{ redacted: string }>("/byok/redact", { text: redactInput })).redacted);

  return (
    <div className="space-y-3">
      <Section title="Per-project API keys">
        <div className="grid grid-cols-4 gap-2">
          <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-8 text-xs" placeholder="projectId" />
          <select value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} className="bg-card border border-border rounded text-xs px-2">
            {["openai", "anthropic", "google", "openrouter", "groq", "ollama"].map((p) => <option key={p}>{p}</option>)}
          </select>
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="h-8 text-xs" placeholder="Label" />
          <Input type="password" value={draft.secret} onChange={(e) => setDraft({ ...draft, secret: e.target.value })} className="h-8 text-xs" placeholder="sk-…" />
        </div>
        <Button size="sm" onClick={save} className="h-7 text-xs mt-2"><Plus className="w-3 h-3 mr-1" /> Add key</Button>
      </Section>
      <div className="space-y-1">
        {keys.map((k: any) => (
          <div key={k.id} className="border border-border rounded p-2 text-xs flex items-center gap-2">
            <span className="font-mono text-[11px] flex-1">{k.provider} · {k.label} · {k.fingerprint}</span>
            <span className="text-[10px] text-muted-foreground">{k.usage.calls} calls · {k.usage.tokens} tok · ${k.usage.usd}</span>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => incUsage(k.id)}>+1 call</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400" onClick={() => remove(k.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
      <Section title="Redaction (logs / errors)">
        <textarea value={redactInput} onChange={(e) => setRedactInput(e.target.value)} className="w-full h-20 bg-card border border-border rounded p-2 text-[11px] font-mono" />
        <Button size="sm" onClick={redactNow} className="h-7 text-xs mt-1">Preview redacted output</Button>
        {redacted && <pre className="bg-muted/30 border border-border rounded p-2 text-[11px] font-mono whitespace-pre-wrap mt-1">{redacted}</pre>}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- White Label
function WhiteLabelPanel() {
  const [orgId, setOrgId] = useState("acme");
  const [wl, setWl] = useState<any>(null);
  const refresh = async () => setWl(await jget(`/whitelabel/${orgId}`));
  useEffect(() => { refresh(); }, [orgId]);
  const save = async () => setWl(await jput(`/whitelabel/${orgId}`, wl));
  if (!wl) return <div className="text-[11px] text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={orgId} onChange={(e) => setOrgId(e.target.value)} className="h-8 text-xs w-40" placeholder="orgId" />
        <Button size="sm" onClick={save} className="h-8 text-xs ml-auto"><Check className="w-3 h-3 mr-1" /> Save</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-[10px] uppercase text-muted-foreground">Brand name</label>
          <Input value={wl.brandName} onChange={(e) => setWl({ ...wl, brandName: e.target.value })} className="h-8 text-xs" />
          <label className="text-[10px] uppercase text-muted-foreground">Logo URL</label>
          <Input value={wl.logoUrl} onChange={(e) => setWl({ ...wl, logoUrl: e.target.value })} className="h-8 text-xs" />
          <label className="text-[10px] uppercase text-muted-foreground">Custom domain</label>
          <Input value={wl.customDomain} onChange={(e) => setWl({ ...wl, customDomain: e.target.value })} className="h-8 text-xs" placeholder="dev.acme.com" />
          <label className="text-[10px] uppercase text-muted-foreground">Email "from"</label>
          <Input value={wl.emailFrom} onChange={(e) => setWl({ ...wl, emailFrom: e.target.value })} className="h-8 text-xs" />
          <label className="text-[10px] uppercase text-muted-foreground">Login copy</label>
          <Input value={wl.loginCopy} onChange={(e) => setWl({ ...wl, loginCopy: e.target.value })} className="h-8 text-xs" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase text-muted-foreground">Primary</label>
            <input type="color" value={wl.primaryColor} onChange={(e) => setWl({ ...wl, primaryColor: e.target.value })} className="h-7 w-12 bg-transparent" />
            <label className="text-[10px] uppercase text-muted-foreground">Accent</label>
            <input type="color" value={wl.accentColor} onChange={(e) => setWl({ ...wl, accentColor: e.target.value })} className="h-7 w-12 bg-transparent" />
          </div>
        </div>
        <div className="rounded-lg border border-border p-4 space-y-2" style={{ background: `linear-gradient(135deg, ${wl.primaryColor}22, ${wl.accentColor}22)` }}>
          <div className="text-[10px] uppercase text-muted-foreground">Live preview</div>
          <div className="text-2xl font-bold" style={{ color: wl.primaryColor }}>{wl.brandName}</div>
          <div className="text-[11px]">{wl.loginCopy}</div>
          <button className="px-3 py-1.5 rounded text-xs font-medium text-white" style={{ background: wl.accentColor }}>Sign in</button>
          {wl.customDomain && <div className="text-[10px] text-muted-foreground">https://{wl.customDomain} · TLS {wl.certIssued ? "issued ✓" : "pending"}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Compliance
function CompliancePanel() {
  const [orgId] = useState("acme");
  const [audit, setAudit] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [residency, setResidency] = useState<any>(null);
  const [controls, setControls] = useState<any>(null);
  const [bundle, setBundle] = useState<any>(null);

  const refresh = async () => {
    setAudit(await jget("/compliance/audit"));
    setRegions(await jget("/compliance/regions"));
    setResidency(await jget(`/compliance/${orgId}/residency`));
    setControls(await jget("/compliance/controls"));
  };
  useEffect(() => { refresh(); }, []);

  const log = async () => { await jpost("/compliance/audit", { actorKind: "user", action: "settings.update", resource: "org:acme", meta: { field: "billing" } }); refresh(); };
  const setRegion = async (rid: string) => { await jput(`/compliance/${orgId}/residency`, { regionId: rid }); refresh(); };
  const exportData = async () => setBundle(await jpost("/compliance/me/export", {}));
  const deleteData = async () => { await jdel("/compliance/me"); refresh(); };

  return (
    <div className="space-y-3">
      <Section title="Audit log">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={log} className="h-7 text-xs">Log a test event</Button>
          <span className="text-[10px] text-muted-foreground">{audit.length} events stored</span>
        </div>
        <div className="border border-border rounded text-[10px] font-mono divide-y divide-border max-h-48 overflow-auto">
          {audit.slice(0, 20).map((e) => (
            <div key={e.id} className="grid grid-cols-[10rem_5rem_1fr] gap-2 p-1">
              <span className="text-muted-foreground">{new Date(e.at).toLocaleString()}</span>
              <span className="text-primary">{e.actorKind}</span>
              <span><span className="font-bold">{e.action}</span> on {e.resource}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Data residency">
        <div className="grid grid-cols-3 gap-1">
          {regions.map((r) => (
            <button key={r.id} onClick={() => setRegion(r.id)} className={`text-left text-[11px] border rounded p-1.5 ${residency?.regionId === r.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>
              <div className="font-medium">{r.name}</div>
              <div className="text-[10px] text-muted-foreground">{r.id} · residency {r.residency}</div>
            </button>
          ))}
        </div>
      </Section>
      <Section title="GDPR">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={exportData} className="h-7 text-xs">Export my data (signed)</Button>
          <Button size="sm" variant="outline" onClick={deleteData} className="h-7 text-xs text-red-400">Delete my data</Button>
        </div>
        {bundle && <pre className="bg-muted/30 border border-border rounded p-2 text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-auto">{JSON.stringify(bundle, null, 2)}</pre>}
      </Section>
      {controls && (
        <Section title="SOC2 / HIPAA controls">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <div className="font-bold text-[10px] uppercase">SOC2</div>
              {controls.soc2.map((c: any) => <div key={c.id}>✓ <span className="font-mono">{c.id}</span> {c.title}</div>)}
            </div>
            <div>
              <div className="font-bold text-[10px] uppercase">HIPAA</div>
              {controls.hipaa.map((c: any) => <div key={c.id}>✓ <span className="font-mono">{c.id}</span> {c.title}</div>)}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Encryption — at rest: {controls.encryption.atRest} · in transit: {controls.encryption.inTransit}</div>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Mobile
function MobilePanel() {
  const [name, setName] = useState("MyApp");
  const [framework, setFramework] = useState<"expo" | "flutter">("expo");
  const [features, setFeatures] = useState<string[]>(["nav", "auth"]);
  const [project, setProject] = useState<any>(null);
  const FEATS = ["nav", "auth", "push", "camera", "location", "in-app-purchase"];
  const toggle = (f: string) => setFeatures((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const scaffold = async () => setProject(await jpost("/mobile-builder/scaffold", { name, framework, features }));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" placeholder="App name" />
        <select value={framework} onChange={(e) => setFramework(e.target.value as any)} className="bg-card border border-border rounded text-xs px-2">
          <option value="expo">Expo (React Native)</option>
          <option value="flutter">Flutter</option>
        </select>
        <Button size="sm" onClick={scaffold} className="h-8 text-xs"><Smartphone className="w-3 h-3 mr-1" /> Scaffold</Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {FEATS.map((f) => (
          <button key={f} onClick={() => toggle(f)} className={`px-2 py-1 rounded text-[11px] border ${features.includes(f) ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"}`}>{f}</button>
        ))}
      </div>
      {project && (
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">{project.framework} · {project.files.length} files</div>
          {project.files.map((f: any) => (
            <details key={f.path} className="border border-border rounded">
              <summary className="px-2 py-1 cursor-pointer text-[11px] font-mono">{f.path}</summary>
              <pre className="p-2 text-[10px] font-mono bg-muted/20 whitespace-pre-wrap">{f.content}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Agents
function AgentsPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const [draft, setDraft] = useState({ name: "", description: "", systemPrompt: "", recommendedModel: "claude-opus-4.5", priceCredits: 25, authorName: "you", tools: [] as string[] });
  const [session, setSession] = useState<any>(null);
  const refresh = async () => setAgents(await jget("/agents-marketplace"));
  useEffect(() => { refresh(); }, []);
  const publish = async () => { if (!draft.name || !draft.systemPrompt) return; await jpost("/agents-marketplace", draft); setDraft({ ...draft, name: "", systemPrompt: "" }); refresh(); };
  const buy = async (id: string) => { await jpost(`/agents-marketplace/${id}/buy`, {}); refresh(); };
  const start = async (id: string) => setSession(await jpost("/agents-marketplace/session", { agentId: id }));
  const avg = (rs: number[]) => (rs.length ? (rs.reduce((s, x) => s + x, 0) / rs.length).toFixed(1) : "—");

  return (
    <div className="space-y-3">
      <Section title="Publish agent">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-8 text-xs" />
          <select value={draft.recommendedModel} onChange={(e) => setDraft({ ...draft, recommendedModel: e.target.value })} className="bg-card border border-border rounded text-xs px-2">
            {["claude-opus-4.5", "gpt-5", "gemini-3-pro", "deepseek-coder"].map((m) => <option key={m}>{m}</option>)}
          </select>
          <Input placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="h-8 text-xs" />
          <Input type="number" placeholder="Price credits" value={draft.priceCredits} onChange={(e) => setDraft({ ...draft, priceCredits: Number(e.target.value) })} className="h-8 text-xs" />
        </div>
        <textarea placeholder="System prompt" value={draft.systemPrompt} onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })} className="w-full h-16 mt-2 bg-card border border-border rounded p-2 text-[11px]" />
        <Button size="sm" onClick={publish} className="h-7 text-xs mt-2"><Plus className="w-3 h-3 mr-1" /> Publish</Button>
      </Section>
      <div className="space-y-1 max-h-72 overflow-auto">
        {agents.map((a: any) => (
          <div key={a.id} className="border border-border rounded p-2 text-xs flex items-center gap-2">
            <Bot className="w-3 h-3 text-purple-400" />
            <div className="flex-1">
              <div className="font-medium">{a.name} <span className="text-[10px] text-muted-foreground">⭐ {avg(a.ratings)} · {a.recommendedModel}</span></div>
              <div className="text-[10px] text-muted-foreground">{a.description} · by {a.authorName}</div>
            </div>
            <span className="text-[11px] font-bold">{a.priceCredits}cr</span>
            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => buy(a.id)}>Buy</Button>
            <Button size="sm" className="h-6 text-[10px]" onClick={() => start(a.id)}>Start session</Button>
          </div>
        ))}
      </div>
      {session && (
        <div className="border border-primary/30 bg-primary/5 rounded p-2 text-xs">
          <div className="font-medium">Session started: {session.agentName}</div>
          <div className="text-[10px] text-muted-foreground">model {session.model} · tools: {session.tools.join(", ") || "—"}</div>
          <pre className="text-[10px] mt-1 whitespace-pre-wrap">{session.systemPrompt}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Page
export default function DifferentiatorsPage() {
  const [tab, setTab] = useState<TabId>("diff");
  const grouped = useMemo(() => {
    const g: Record<string, typeof TABS[number][]> = { A: [], B: [], C: [], D: [] };
    TABS.forEach((t) => g[t.phase].push(t));
    return g;
  }, []);

  const renderTab = () => {
    switch (tab) {
      case "diff": return <VisualDiffPanel />;
      case "voice": return <VoicePanel />;
      case "screen": return <ScreenToCodePanel />;
      case "collab": return <CollabPanel />;
      case "time": return <TimeMachinePanel />;
      case "tests": return <AutoTestPanel />;
      case "docs": return <AutoDocsPanel />;
      case "secscan": return <SecScanPanel />;
      case "perf": return <PerfPanel />;
      case "cost": return <CostPanel />;
      case "cloud": return <CloudPanel />;
      case "dbai": return <DbAiPanel />;
      case "market": return <MarketplacePanel />;
      case "learn": return <LearningPanel />;
      case "offline": return <OfflinePanel />;
      case "byok": return <ByokPanel />;
      case "white": return <WhiteLabelPanel />;
      case "comp": return <CompliancePanel />;
      case "mobile": return <MobilePanel />;
      case "agents": return <AgentsPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="differentiators-page">
      <div className="border-b border-border bg-card/40 px-6 py-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Flagship 4</div>
        <h1 className="text-2xl font-bold">20 Unique Differentiators</h1>
        <p className="text-sm text-muted-foreground mt-1">Features competitors don't have, all working v1, end-to-end.</p>
      </div>
      <div className="grid grid-cols-[16rem_1fr] min-h-[calc(100vh-100px)]">
        <aside className="border-r border-border p-3 overflow-auto">
          {(["A", "B", "C", "D"] as const).map((phase) => (
            <div key={phase} className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Phase {phase}</div>
              {grouped[phase].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    data-testid={`tab-${t.id}`}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left ${tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="flex-1">{t.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>
        <main className="p-6 overflow-auto">
          {renderTab()}
        </main>
      </div>
    </div>
  );
}
