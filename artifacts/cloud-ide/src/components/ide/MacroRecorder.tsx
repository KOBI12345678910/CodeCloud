import { useState, useCallback } from "react";
import { X, Circle, Square, Play, Save, Trash2, Keyboard } from "lucide-react";

interface Macro {
  id: string;
  name: string;
  shortcut?: string;
  steps: { type: string; key: string; timestamp: number }[];
  createdAt: string;
}

interface Props { onClose: () => void; }

export function MacroRecorder({ onClose }: Props) {
  const [recording, setRecording] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<{ type: string; key: string; timestamp: number }[]>([]);
  const [macros, setMacros] = useState<Macro[]>([
    { id: "m1", name: "Format & Save", shortcut: "Ctrl+Shift+F", steps: [{ type: "keydown", key: "Ctrl+Shift+F", timestamp: 0 }, { type: "keydown", key: "Ctrl+S", timestamp: 500 }], createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "m2", name: "Comment Block", shortcut: "Ctrl+Shift+/", steps: [{ type: "keydown", key: "Ctrl+Shift+K", timestamp: 0 }, { type: "keydown", key: "Ctrl+/", timestamp: 200 }], createdAt: new Date(Date.now() - 172800000).toISOString() },
  ]);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const startRecording = () => { setRecording(true); setCurrentSteps([]); };
  const stopRecording = () => { setRecording(false); setShowSave(true); };

  const saveMacro = () => {
    if (!saveName.trim()) return;
    const macro: Macro = { id: crypto.randomUUID(), name: saveName.trim(), steps: currentSteps.length > 0 ? currentSteps : [{ type: "keydown", key: "Ctrl+S", timestamp: 0 }], createdAt: new Date().toISOString() };
    setMacros([...macros, macro]);
    setSaveName("");
    setShowSave(false);
    setCurrentSteps([]);
  };

  const deleteMacro = (id: string) => setMacros(macros.filter(m => m.id !== id));

  return (
    <div className="h-full flex flex-col bg-background" data-testid="macro-recorder">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Keyboard className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Macro Recorder</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center gap-2">
          {!recording ? (
            <button onClick={startRecording} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-400"><Circle className="w-3 h-3" /> Record</button>
          ) : (
            <button onClick={stopRecording} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-400 animate-pulse"><Square className="w-3 h-3" /> Stop</button>
          )}
          {recording && <span className="text-[10px] text-red-400 animate-pulse">Recording keystrokes...</span>}
        </div>

        {showSave && (
          <div className="bg-card/50 rounded border border-border/30 p-2 space-y-2">
            <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Macro name..." className="w-full bg-muted/50 px-2 py-1 text-xs rounded outline-none border border-border/30 focus:border-primary/50" autoFocus />
            <div className="flex gap-1">
              <button onClick={saveMacro} className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px]"><Save className="w-2.5 h-2.5" /> Save</button>
              <button onClick={() => { setShowSave(false); setCurrentSteps([]); }} className="px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted rounded">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Saved Macros ({macros.length})</div>
          {macros.map(macro => (
            <div key={macro.id} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 p-2 group">
              <Keyboard className="w-3 h-3 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="text-[10px] font-medium">{macro.name}</div>
                <div className="text-[9px] text-muted-foreground">{macro.steps.length} steps{macro.shortcut && ` · ${macro.shortcut}`}</div>
              </div>
              <button className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100" title="Replay"><Play className="w-2.5 h-2.5 text-green-400" /></button>
              <button onClick={() => deleteMacro(macro.id)} className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100" title="Delete"><Trash2 className="w-2.5 h-2.5 text-red-400" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
