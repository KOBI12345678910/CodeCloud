import { useState } from "react";
import { X, FileText, Plus, Code2, Database, TestTube, Layout, Loader2 } from "lucide-react";

interface FileTemplate {
  id: string;
  name: string;
  icon: string;
  extension: string;
  content: string;
}

interface Props { onInsert?: (name: string, content: string) => void; onClose: () => void; }

const TEMPLATES: FileTemplate[] = [
  { id: "component", name: "React Component", icon: "component", extension: ".tsx", content: `import { useState } from "react";\n\ninterface Props {\n  title: string;\n}\n\nexport function Component({ title }: Props) {\n  return (\n    <div>\n      <h1>{title}</h1>\n    </div>\n  );\n}` },
  { id: "route", name: "Express Route", icon: "route", extension: ".ts", content: `import { Router } from "express";\n\nconst router = Router();\n\nrouter.get("/", async (req, res) => {\n  res.json({ status: "ok" });\n});\n\nexport default router;` },
  { id: "model", name: "Database Model", icon: "model", extension: ".ts", content: `import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";\n\nexport const items = pgTable("items", {\n  id: serial("id").primaryKey(),\n  name: varchar("name", { length: 255 }).notNull(),\n  createdAt: timestamp("created_at").defaultNow(),\n});` },
  { id: "test", name: "Test File", icon: "test", extension: ".test.ts", content: `import { describe, it, expect } from "vitest";\n\ndescribe("feature", () => {\n  it("should work", () => {\n    expect(true).toBe(true);\n  });\n});` },
  { id: "hook", name: "React Hook", icon: "component", extension: ".ts", content: `import { useState, useEffect } from "react";\n\nexport function useCustomHook() {\n  const [data, setData] = useState(null);\n  const [loading, setLoading] = useState(true);\n\n  useEffect(() => {\n    // fetch data\n    setLoading(false);\n  }, []);\n\n  return { data, loading };\n}` },
];

const ICONS: Record<string, any> = { component: Layout, route: Code2, model: Database, test: TestTube };

export function FileTemplates({ onInsert, onClose }: Props) {
  const [fileName, setFileName] = useState("");
  const [selected, setSelected] = useState<FileTemplate | null>(null);

  const insert = () => {
    if (!selected || !fileName.trim()) return;
    onInsert?.(fileName.trim() + selected.extension, selected.content);
    setSelected(null);
    setFileName("");
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="file-templates">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">File Templates</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {TEMPLATES.map(t => {
          const Icon = ICONS[t.icon] || FileText;
          return (
            <button key={t.id} onClick={() => setSelected(t)} className={`w-full flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${selected?.id === t.id ? "border-primary bg-primary/5" : "border-border/30 bg-card/50 hover:bg-muted/50"}`}>
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1"><div className="text-xs font-medium">{t.name}</div><div className="text-[9px] text-muted-foreground font-mono">{t.extension}</div></div>
            </button>
          );
        })}
        {selected && (
          <div className="border-t border-border/30 pt-2 space-y-2">
            <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder={`File name (without ${selected.extension})`} className="w-full bg-muted/50 px-2 py-1.5 text-xs rounded outline-none border border-border/30 focus:border-primary/50" autoFocus />
            <pre className="text-[10px] font-mono bg-muted/30 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">{selected.content}</pre>
            <button onClick={insert} disabled={!fileName.trim()} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
              <Plus className="w-3 h-3" /> Create {fileName.trim()}{selected.extension}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
