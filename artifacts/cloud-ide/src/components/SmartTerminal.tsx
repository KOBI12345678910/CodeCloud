import { useState, useEffect, useRef } from "react";
import { X, Terminal, Zap, ChevronDown } from "lucide-react";

interface Props { onClose: () => void; }

const COMMON_COMMANDS = [
  { cmd: "npm install", desc: "Install dependencies" },
  { cmd: "npm run build", desc: "Build project" },
  { cmd: "npm run dev", desc: "Start dev server" },
  { cmd: "npm test", desc: "Run tests" },
  { cmd: "git status", desc: "Check git status" },
  { cmd: "git add .", desc: "Stage all changes" },
  { cmd: "git commit -m ''", desc: "Commit changes" },
  { cmd: "npx tsc --noEmit", desc: "Type check" },
  { cmd: "npx prisma generate", desc: "Generate Prisma client" },
  { cmd: "npx drizzle-kit push", desc: "Push DB schema" },
];

export function SmartTerminal({ onClose }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<typeof COMMON_COMMANDS>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); return; }
    const filtered = COMMON_COMMANDS.filter(c => c.cmd.toLowerCase().includes(input.toLowerCase()) || c.desc.toLowerCase().includes(input.toLowerCase()));
    setSuggestions(filtered);
    setSelectedIndex(-1);
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, -1)); }
    if (e.key === "Tab" && suggestions.length > 0) { e.preventDefault(); setInput(suggestions[Math.max(0, selectedIndex)].cmd); setSuggestions([]); }
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="smart-terminal">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Smart Terminal</span><Zap className="w-3 h-3 text-yellow-400" /></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Quick Commands</div>
        <div className="grid grid-cols-2 gap-1">
          {COMMON_COMMANDS.map(c => (
            <button key={c.cmd} onClick={() => setInput(c.cmd)} className="text-left bg-card/50 rounded p-1.5 border border-border/30 hover:border-primary/30">
              <div className="text-[11px] font-mono truncate">{c.cmd}</div>
              <div className="text-[9px] text-muted-foreground">{c.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-border/30 px-3 py-2 shrink-0 relative">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mx-3 mb-1 bg-card border border-border/50 rounded shadow-lg z-10">
            {suggestions.map((s, i) => (
              <button key={s.cmd} onClick={() => { setInput(s.cmd); setSuggestions([]); }} className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-muted/50 ${i === selectedIndex ? "bg-muted/50" : ""}`}>
                <span className="font-mono flex-1 truncate">{s.cmd}</span><span className="text-[10px] text-muted-foreground">{s.desc}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400 font-mono">$</span>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-transparent text-xs font-mono outline-none" placeholder="Type a command..." autoFocus />
        </div>
      </div>
    </div>
  );
}
