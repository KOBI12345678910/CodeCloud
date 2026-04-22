import { useState } from "react";
import { X, Layout, Monitor, Bug, MessageSquare, Maximize2, Save, Check } from "lucide-react";

interface Props { onClose: () => void; onApplyPreset: (preset: string) => void; }

interface Preset { id: string; name: string; description: string; icon: any; panels: string[]; }

export function LayoutPresets({ onClose, onApplyPreset }: Props) {
  const [applied, setApplied] = useState("");

  const presets: Preset[] = [
    { id: "focus", name: "Focus Mode", description: "Editor only — maximum coding space", icon: Monitor, panels: ["editor"] },
    { id: "debug", name: "Debug Mode", description: "Editor + Terminal + Output", icon: Bug, panels: ["editor", "terminal", "output"] },
    { id: "review", name: "Review Mode", description: "Editor + Diff + Comments", icon: MessageSquare, panels: ["editor", "diff", "comments"] },
    { id: "full", name: "Full Mode", description: "All panels visible", icon: Maximize2, panels: ["editor", "terminal", "preview", "filetree", "output"] },
  ];

  const apply = (id: string) => {
    setApplied(id);
    onApplyPreset(id);
    setTimeout(() => setApplied(""), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="layout-presets">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Layout className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Layout Presets</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {presets.map(p => {
          const Icon = p.icon;
          return (
            <button key={p.id} onClick={() => apply(p.id)} className="w-full flex items-center gap-3 bg-card/50 rounded-lg p-3 border border-border/30 hover:border-primary/30 hover:bg-card/80 text-left transition-colors">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-medium">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.description}</div>
                <div className="flex gap-1 mt-1">{p.panels.map(panel => <span key={panel} className="px-1 py-0.5 text-[9px] bg-muted rounded">{panel}</span>)}</div>
              </div>
              {applied === p.id ? <Check className="w-4 h-4 text-green-400" /> : <Layout className="w-4 h-4 text-muted-foreground" />}
            </button>
          );
        })}
        <div className="border-t border-border/30 pt-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded">
            <Save className="w-3.5 h-3.5" /> Save current layout as preset
          </button>
        </div>
      </div>
    </div>
  );
}
