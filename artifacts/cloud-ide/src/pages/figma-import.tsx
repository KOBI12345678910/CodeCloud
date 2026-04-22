import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Figma, Upload, ArrowRight, CheckCircle2, Layers, Code2, Eye, Sparkles, RefreshCw, Settings2, Paintbrush, Layout, Type, Grid3X3 } from "lucide-react";

interface FigmaFile { id: string; name: string; lastModified: string; thumbnailUrl: string; pages: number; components: number; }
interface ImportedComponent { id: string; name: string; figmaId: string; status: "imported" | "syncing" | "error"; framework: string; responsive: boolean; linesOfCode: number; }

const DEMO_FILES: FigmaFile[] = [
  { id: "fig1", name: "CodeCloud Design System", lastModified: "2026-04-22T10:00:00Z", thumbnailUrl: "", pages: 12, components: 156 },
  { id: "fig2", name: "Landing Page Redesign", lastModified: "2026-04-20T14:00:00Z", thumbnailUrl: "", pages: 5, components: 42 },
  { id: "fig3", name: "Mobile App Screens", lastModified: "2026-04-18T09:00:00Z", thumbnailUrl: "", pages: 8, components: 67 },
  { id: "fig4", name: "Admin Dashboard", lastModified: "2026-04-15T16:00:00Z", thumbnailUrl: "", pages: 6, components: 89 },
];

const IMPORTED: ImportedComponent[] = [
  { id: "ic1", name: "HeroSection", figmaId: "fig1", status: "imported", framework: "React + Tailwind", responsive: true, linesOfCode: 124 },
  { id: "ic2", name: "PricingCard", figmaId: "fig1", status: "imported", framework: "React + Tailwind", responsive: true, linesOfCode: 89 },
  { id: "ic3", name: "FeatureGrid", figmaId: "fig1", status: "imported", framework: "React + Tailwind", responsive: true, linesOfCode: 156 },
  { id: "ic4", name: "NavigationBar", figmaId: "fig1", status: "syncing", framework: "React + Tailwind", responsive: true, linesOfCode: 0 },
  { id: "ic5", name: "Footer", figmaId: "fig2", status: "imported", framework: "React + Tailwind", responsive: true, linesOfCode: 67 },
];

export default function FigmaImportPage() {
  const [tab, setTab] = useState<"connect" | "imported" | "settings">("connect");
  const [connected, setConnected] = useState(true);
  const [importing, setImporting] = useState(false);
  const [framework, setFramework] = useState("react-tailwind");

  return (
    <FeaturePageLayout title="Figma to Code" description="Import Figma designs and convert them to production-ready components using AI" icon={<Figma className="w-7 h-7 text-white" />} badge={connected ? "Connected" : "Not Connected"} badgeVariant={connected ? "success" : "default"}>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-white">{DEMO_FILES.length}</p><p className="text-xs text-gray-400">Figma Files</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-purple-400">{DEMO_FILES.reduce((a, f) => a + f.components, 0)}</p><p className="text-xs text-gray-400">Components</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-green-400">{IMPORTED.filter(c => c.status === "imported").length}</p><p className="text-xs text-gray-400">Imported</p></div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center"><p className="text-2xl font-bold text-blue-400">{IMPORTED.reduce((a, c) => a + c.linesOfCode, 0)}</p><p className="text-xs text-gray-400">Lines Generated</p></div>
      </div>

      <div className="flex gap-2 mb-6">
        {(["connect", "imported", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
            {t === "connect" ? "Figma Files" : t}
          </button>
        ))}
      </div>

      {tab === "connect" && (
        <div className="space-y-4">
          {!connected && (
            <div className="p-8 bg-white/5 border border-white/10 rounded-xl text-center space-y-4">
              <Figma className="w-16 h-16 text-purple-400 mx-auto" />
              <h3 className="text-lg font-medium text-white">Connect your Figma account</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">Link your Figma account to import designs and automatically convert them to production-ready React components.</p>
              <button onClick={() => setConnected(true)} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">Connect Figma</button>
            </div>
          )}
          {connected && (
            <div className="space-y-3">
              {DEMO_FILES.map(file => (
                <div key={file.id} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors">
                  <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center flex-shrink-0">
                    <Figma className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-gray-500">{file.pages} pages · {file.components} components · Updated {new Date(file.lastModified).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-lg transition-colors"><Eye className="w-3 h-3" /> Preview</button>
                    <button onClick={() => { setImporting(true); setTimeout(() => setImporting(false), 3000); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors">
                      {importing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Import with AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "imported" && (
        <div className="space-y-3">
          {IMPORTED.map(comp => (
            <div key={comp.id} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/[0.07] transition-colors">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${comp.status === "imported" ? "bg-green-500/20" : comp.status === "syncing" ? "bg-yellow-500/20" : "bg-red-500/20"}`}>
                {comp.status === "imported" ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : comp.status === "syncing" ? <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin" /> : <Layers className="w-5 h-5 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{comp.name}</p>
                <p className="text-xs text-gray-500">{comp.framework} · {comp.responsive ? "Responsive" : "Fixed"} {comp.linesOfCode > 0 && `· ${comp.linesOfCode} lines`}</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-lg"><Code2 className="w-3 h-3" /> Code</button>
                <button className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg"><ArrowRight className="w-3 h-3" /> Use</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-6">
          <div className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-white flex items-center gap-2"><Settings2 className="w-4 h-4" /> Import Settings</h3>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Target Framework</label>
              <div className="grid grid-cols-3 gap-2">
                {[["react-tailwind", "React + Tailwind"], ["react-css", "React + CSS Modules"], ["vue-tailwind", "Vue + Tailwind"]].map(([v, l]) => (
                  <button key={v} onClick={() => setFramework(v)} className={`p-3 rounded-lg text-xs font-medium transition-all ${framework === v ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[["Auto-detect responsive breakpoints", true], ["Generate TypeScript types", true], ["Include animations", true], ["Extract design tokens", false], ["Generate Storybook stories", false]].map(([label, checked]) => (
                <label key={label as string} className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-4 h-4 rounded border ${checked ? "bg-blue-600 border-blue-600" : "border-gray-600"} flex items-center justify-center`}>{checked && <CheckCircle2 className="w-3 h-3 text-white" />}</div>
                  <span className="text-sm text-gray-300">{label as string}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </FeaturePageLayout>
  );
}
