import { useState, useEffect } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function DesignTokensPage() {
  const [projectId] = useState("demo-project");
  const [system, setSystem] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [tab, setTab] = useState<"colors" | "typography" | "spacing" | "components" | "export">("colors");

  const load = async () => {
    const r = await fetch(api(`/design-tokens/${projectId}`));
    const d = await r.json();
    setInitialized(d.initialized);
    if (d.initialized) setSystem(d.system);
    else if (d.defaultTokens) setSystem({ tokens: d.defaultTokens, components: [] });
  };

  useEffect(() => { load(); }, []);

  const init = async () => {
    const r = await fetch(api(`/design-tokens/${projectId}`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Design System" }),
    });
    setSystem(await r.json());
    setInitialized(true);
  };

  const tabs = [
    { id: "colors", label: "Colors", icon: "🎨" },
    { id: "typography", label: "Typography", icon: "📝" },
    { id: "spacing", label: "Spacing & Radii", icon: "📐" },
    { id: "components", label: "Components", icon: "🧩" },
    { id: "export", label: "Export", icon: "📦" },
  ] as const;

  return (
    <FeaturePageLayout title="Design System" subtitle="Tokens, typography, components — your visual language" badge="Design" testId="design-tokens-page">
      <div className="space-y-8">
        <div className="flex items-center justify-end gap-3">
          {!initialized && <button onClick={init} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Initialize Design System</button>}
          {initialized && system && <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded">v{system.version}</span>}
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-sm ${tab === t.id ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "colors" && system?.tokens?.colors && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Color Tokens</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(system.tokens.colors).map(([name, tok]: [string, any]) => (
                <div key={name} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="h-16" style={{ backgroundColor: tok.value }} />
                  <div className="p-2">
                    <div className="text-xs font-medium truncate">{name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{tok.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "typography" && system?.tokens?.typography && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Typography Scale</h2>
            <div className="space-y-3">
              {Object.entries(system.tokens.typography).map(([name, tok]: [string, any]) => (
                <div key={name} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div style={{ fontFamily: tok.fontFamily, fontSize: tok.fontSize, fontWeight: tok.fontWeight, lineHeight: tok.lineHeight }}>
                    {name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono space-x-3">
                    <span>{tok.fontSize}</span>
                    <span>{tok.fontWeight}</span>
                    <span>{tok.fontFamily}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "spacing" && system?.tokens && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Spacing Scale</h2>
              {Object.entries(system.tokens.spacing).map(([name, tok]: [string, any]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-8 text-muted-foreground">{name}</span>
                  <div className="h-4 bg-primary/30 rounded" style={{ width: `calc(${tok.value} * 4)` }} />
                  <span className="text-xs text-muted-foreground">{tok.value}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Border Radius</h2>
              {Object.entries(system.tokens.radii).map(([name, tok]: [string, any]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-8 text-muted-foreground">{name}</span>
                  <div className="w-16 h-16 bg-primary/20 border border-primary/40" style={{ borderRadius: tok.value }} />
                  <span className="text-xs text-muted-foreground">{tok.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "components" && system?.components && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Component Library</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {system.components.map((c: any) => (
                <div key={c.name} className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{c.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.variants.map((v: string) => (
                      <span key={v} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{v}</span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.tokens.length} tokens used</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { format: "css", label: "CSS Variables", desc: ":root { --color-primary: ... }" },
              { format: "tailwind", label: "Tailwind Config", desc: "theme.extend.colors" },
              { format: "json", label: "JSON Tokens", desc: "Standard token format" },
              { format: "scss", label: "SCSS Variables", desc: "$color-primary: ..." },
              { format: "figma", label: "Figma Tokens", desc: "Figma-compatible format" },
            ].map(e => (
              <div key={e.format} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">{e.label}</h3>
                <p className="text-xs text-muted-foreground font-mono">{e.desc}</p>
                <a href={api(`/design-tokens/${projectId}/export/${e.format}`)} target="_blank" className="inline-block bg-primary text-primary-foreground rounded px-3 py-1 text-xs">Export</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </FeaturePageLayout>
  );
}
