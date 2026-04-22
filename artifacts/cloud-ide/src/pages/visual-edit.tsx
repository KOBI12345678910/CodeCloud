import { useState, useMemo } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Layers,
  Eye,
  EyeOff,
  Type,
  Palette,
  BoxSelect,
  Square,
  SunDim,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MousePointer2,
} from "lucide-react";

type DeviceMode = "desktop" | "tablet" | "mobile";

interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  children?: LayerItem[];
}

interface CssChange {
  id: string;
  selector: string;
  property: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

const demoLayers: LayerItem[] = [
  { id: "l1", name: "Header", type: "header", visible: true, children: [
    { id: "l1a", name: "Logo", type: "img", visible: true },
    { id: "l1b", name: "Navigation", type: "nav", visible: true },
    { id: "l1c", name: "CTA Button", type: "button", visible: true },
  ]},
  { id: "l2", name: "Hero Section", type: "section", visible: true, children: [
    { id: "l2a", name: "Headline", type: "h1", visible: true },
    { id: "l2b", name: "Subheading", type: "p", visible: true },
    { id: "l2c", name: "Hero Image", type: "img", visible: true },
  ]},
  { id: "l3", name: "Features Grid", type: "section", visible: true },
  { id: "l4", name: "Testimonials", type: "section", visible: false },
  { id: "l5", name: "Footer", type: "footer", visible: true },
];

const demoCssChanges: CssChange[] = [
  { id: "c1", selector: ".hero h1", property: "font-size", oldValue: "48px", newValue: "56px", timestamp: "2m ago" },
  { id: "c2", selector: ".cta-btn", property: "background", oldValue: "#3b82f6", newValue: "#6366f1", timestamp: "5m ago" },
  { id: "c3", selector: ".nav", property: "padding", oldValue: "16px", newValue: "20px", timestamp: "8m ago" },
  { id: "c4", selector: ".hero", property: "gap", oldValue: "24px", newValue: "32px", timestamp: "12m ago" },
];

const deviceWidths: Record<DeviceMode, string> = { desktop: "100%", tablet: "768px", mobile: "375px" };

const previewHtml = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0f172a;color:#e2e8f0;font-family:Inter,system-ui,sans-serif}
.nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:#1e293b;border-bottom:1px solid #334155}
.nav .logo{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#3b82f6,#8b5cf6)}
.nav .links{display:flex;gap:20px;font-size:13px;color:#94a3b8}
.nav .links a:hover{color:#e2e8f0}
.nav .cta-btn{padding:6px 16px;border-radius:6px;background:#3b82f6;color:white;font-size:12px;font-weight:500;border:none;cursor:pointer}
.hero{text-align:center;padding:64px 24px;max-width:640px;margin:0 auto}
.hero h1{font-size:48px;font-weight:700;line-height:1.2;margin-bottom:16px;background:linear-gradient(135deg,#fff,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{font-size:14px;color:#94a3b8;margin-bottom:32px;line-height:1.6}
.hero .preview-box{width:100%;height:160px;border-radius:12px;background:linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15));border:1px solid rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;color:#475569;font-size:12px}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:0 24px 64px;max-width:800px;margin:0 auto}
.features .card{padding:20px;border-radius:12px;background:#1e293b;border:1px solid #334155}
.features .card h3{font-size:14px;margin-bottom:8px}
.features .card p{font-size:12px;color:#94a3b8}
</style></head><body>
<div class="nav"><div class="logo"></div><div class="links"><a>Home</a><a>Features</a><a>Pricing</a><a>Docs</a></div><button class="cta-btn">Get Started</button></div>
<div class="hero"><h1>Build faster with AI</h1><p>The next-generation cloud development platform for modern teams. Ship ideas in seconds, not days.</p><div class="preview-box">Live Preview Area</div></div>
<div class="features"><div class="card"><h3>AI Copilot</h3><p>Context-aware code completion and generation.</p></div><div class="card"><h3>Real-time Collab</h3><p>Edit together with multiplayer cursors.</p></div><div class="card"><h3>Instant Deploy</h3><p>Ship to production in one click.</p></div></div>
</body></html>`;

export default function VisualEditPage() {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [zoom, setZoom] = useState([100]);
  const [layers, setLayers] = useState(demoLayers);
  const [showLayers, setShowLayers] = useState(true);
  const [showChangelog, setShowChangelog] = useState(true);
  const [selectedElement, setSelectedElement] = useState("hero-headline");
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(["l1", "l2"]));
  const [undoStack] = useState(3);
  const [redoStack] = useState(1);

  const [typography, setTypography] = useState({ fontFamily: "Inter", fontSize: "56", fontWeight: "700", lineHeight: "1.2", letterSpacing: "0", color: "#ffffff" });
  const [spacing, setSpacing] = useState({ marginTop: "0", marginBottom: "24", paddingTop: "0", paddingBottom: "0", paddingLeft: "16", paddingRight: "16" });
  const [border, setBorder] = useState({ width: "0", radius: "8", color: "#334155", style: "solid" });
  const [shadow, setShadow] = useState({ x: "0", y: "4", blur: "12", spread: "0", color: "#00000040" });

  const iframeSrcDoc = useMemo(() => previewHtml, []);

  const toggleLayerVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === id) return { ...l, visible: !l.visible };
        if (l.children) {
          return { ...l, children: l.children.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)) };
        }
        return l;
      })
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <FeaturePageLayout title="Visual Editor" subtitle="Click-to-edit visual design tool with live preview" badge="Design Tools" testId="visual-edit-page">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card/50 backdrop-blur border border-border/50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <MousePointer2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Inspector Mode</span>
          </div>
          <div className="flex items-center gap-1">
            {([
              { mode: "desktop" as DeviceMode, icon: Monitor },
              { mode: "tablet" as DeviceMode, icon: Tablet },
              { mode: "mobile" as DeviceMode, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <Button key={mode} variant={device === mode ? "default" : "ghost"} size="sm" className="h-8 w-8 p-0" onClick={() => setDevice(mode)}>
                <Icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
              <Slider value={zoom} onValueChange={setZoom} min={25} max={200} step={25} className="w-24" />
              <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground w-10">{zoom[0]}%</span>
            </div>
            <div className="h-5 w-px bg-border" />
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" disabled={undoStack === 0}>
              <Undo2 className="w-3.5 h-3.5" /> Undo ({undoStack})
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" disabled={redoStack === 0}>
              <Redo2 className="w-3.5 h-3.5" /> Redo ({redoStack})
            </Button>
            <div className="h-5 w-px bg-border" />
            <Button variant={showLayers ? "default" : "ghost"} size="sm" className="h-8 gap-1 text-xs" onClick={() => setShowLayers(!showLayers)}>
              <Layers className="w-3.5 h-3.5" /> Layers
            </Button>
          </div>
        </div>

        <div className="border border-border/50 rounded-lg overflow-hidden" style={{ height: 600 }}>
          <ResizablePanelGroup direction="horizontal">
            {showLayers && (
              <>
                <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                  <div className="h-full bg-card/50 backdrop-blur overflow-y-auto">
                    <div className="py-3 px-4 border-b border-border/30">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Layers</span>
                    </div>
                    <div className="px-2 py-2 space-y-0.5">
                      {layers.map((layer) => (
                        <div key={layer.id}>
                          <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-accent/50 ${selectedElement === layer.id ? "bg-primary/10 text-primary" : ""}`} onClick={() => setSelectedElement(layer.id)}>
                            {layer.children ? (
                              <button onClick={(e) => { e.stopPropagation(); toggleExpand(layer.id); }} className="p-0.5">
                                {expandedLayers.has(layer.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            ) : (
                              <span className="w-4" />
                            )}
                            <span className="flex-1 truncate text-xs">{layer.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{layer.type}</Badge>
                            <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} className="p-0.5 opacity-60 hover:opacity-100">
                              {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                            </button>
                          </div>
                          {layer.children && expandedLayers.has(layer.id) && layer.children.map((child) => (
                            <div key={child.id} className={`flex items-center gap-1.5 pl-7 pr-2 py-1.5 rounded text-sm cursor-pointer hover:bg-accent/50 ${selectedElement === child.id ? "bg-primary/10 text-primary" : ""}`} onClick={() => setSelectedElement(child.id)}>
                              <span className="flex-1 truncate text-xs">{child.name}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{child.type}</Badge>
                              <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(child.id); }} className="p-0.5 opacity-60 hover:opacity-100">
                                {child.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            <ResizablePanel defaultSize={55} minSize={30}>
              <div className="h-full bg-card/30 backdrop-blur flex items-center justify-center p-4 overflow-auto">
                <div className="relative" style={{ width: deviceWidths[device], maxWidth: "100%", transform: `scale(${zoom[0] / 100})`, transformOrigin: "top center" }}>
                  <iframe
                    srcDoc={iframeSrcDoc}
                    title="Live Preview"
                    className="w-full border-2 border-dashed border-primary/30 rounded-lg bg-slate-900"
                    style={{ height: 500, pointerEvents: "none" }}
                    sandbox="allow-same-origin"
                  />
                  <div className="absolute top-0 left-0 bg-background/80 text-[9px] text-muted-foreground px-1.5 py-0.5 rounded-br z-10">
                    {device === "desktop" ? "1280px" : device === "tablet" ? "768px" : "375px"}
                  </div>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
              <div className="h-full bg-card/50 backdrop-blur overflow-y-auto p-4 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Type className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Typography</span>
                  </div>
                  <div className="space-y-2">
                    {([
                      { label: "Font", key: "fontFamily" as const, type: "text" },
                      { label: "Size", key: "fontSize" as const, type: "number" },
                      { label: "Weight", key: "fontWeight" as const, type: "number" },
                      { label: "Line H.", key: "lineHeight" as const, type: "text" },
                      { label: "Spacing", key: "letterSpacing" as const, type: "number" },
                    ]).map(({ label, key, type }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-14">{label}</span>
                        <Input value={typography[key]} onChange={(e) => setTypography({ ...typography, [key]: e.target.value })} type={type} className="h-7 text-xs bg-background/50" />
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-14">Color</span>
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="w-7 h-7 rounded border border-border" style={{ backgroundColor: typography.color }} />
                        <Input value={typography.color} onChange={(e) => setTypography({ ...typography, color: e.target.value })} className="h-7 text-xs bg-background/50 flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BoxSelect className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Spacing</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(spacing).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground w-6">{key.replace("margin", "M").replace("padding", "P").replace("Top", "T").replace("Bottom", "B").replace("Left", "L").replace("Right", "R")}</span>
                        <Input value={value} onChange={(e) => setSpacing({ ...spacing, [key]: e.target.value })} type="number" className="h-6 text-[10px] bg-background/50 px-1.5" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Border</span>
                  </div>
                  <div className="space-y-2">
                    {([
                      { label: "Width", key: "width" as const },
                      { label: "Radius", key: "radius" as const },
                    ]).map(({ label, key }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-14">{label}</span>
                        <Input value={border[key]} onChange={(e) => setBorder({ ...border, [key]: e.target.value })} type="number" className="h-7 text-xs bg-background/50" />
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-14">Color</span>
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className="w-7 h-7 rounded border border-border" style={{ backgroundColor: border.color }} />
                        <Input value={border.color} onChange={(e) => setBorder({ ...border, color: e.target.value })} className="h-7 text-xs bg-background/50 flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border/50" />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <SunDim className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Shadow</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(shadow).filter(([k]) => k !== "color").map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground w-10 capitalize">{key}</span>
                        <Input value={value} onChange={(e) => setShadow({ ...shadow, [key]: e.target.value })} type="number" className="h-6 text-[10px] bg-background/50 px-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowChangelog(!showChangelog)}>
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Square className="w-3.5 h-3.5" /> CSS Change Log
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
              {showChangelog ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> Expand</>}
            </Button>
          </CardHeader>
          {showChangelog && (
            <CardContent className="px-4 pb-3">
              <div className="space-y-1.5">
                {demoCssChanges.map((change) => (
                  <div key={change.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded bg-background/30 border border-border/20">
                    <code className="text-primary font-mono text-[10px]">{change.selector}</code>
                    <span className="text-muted-foreground">{change.property}:</span>
                    <span className="line-through text-red-400/70 font-mono text-[10px]">{change.oldValue}</span>
                    <span className="text-green-400 font-mono text-[10px]">{change.newValue}</span>
                    <span className="ml-auto text-muted-foreground text-[10px]">{change.timestamp}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </FeaturePageLayout>
  );
}
