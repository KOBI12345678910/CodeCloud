import { useState, useEffect, useRef, useCallback } from "react";
import {
  Scissors, Copy, ClipboardPaste, AlignLeft, FunctionSquare, Variable,
  Type, Navigation, Search, Eye, Bot, Wand2, ChevronRight,
} from "lucide-react";

interface ContextMenuAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  dividerAfter?: boolean;
  submenu?: { label: string; action: string }[];
  action?: string;
  disabled?: boolean;
}

const ACTIONS: ContextMenuAction[] = [
  { label: "Cut", icon: Scissors, shortcut: "Ctrl+X", action: "cut" },
  { label: "Copy", icon: Copy, shortcut: "Ctrl+C", action: "copy" },
  { label: "Paste", icon: ClipboardPaste, shortcut: "Ctrl+V", action: "paste", dividerAfter: true },
  { label: "Format Selection", icon: AlignLeft, shortcut: "Ctrl+Shift+F", action: "formatSelection", dividerAfter: true },
  { label: "Extract Function", icon: FunctionSquare, action: "extractFunction" },
  { label: "Extract Variable", icon: Variable, action: "extractVariable" },
  { label: "Rename Symbol", icon: Type, shortcut: "F2", action: "renameSymbol", dividerAfter: true },
  { label: "Go to Definition", icon: Navigation, shortcut: "F12", action: "goToDefinition" },
  { label: "Find References", icon: Search, shortcut: "Shift+F12", action: "findReferences" },
  { label: "Peek Definition", icon: Eye, shortcut: "Alt+F12", action: "peekDefinition", dividerAfter: true },
  {
    label: "AI Explain", icon: Bot, action: "aiExplain",
    submenu: [
      { label: "Explain Selection", action: "aiExplainSelection" },
      { label: "Explain Function", action: "aiExplainFunction" },
      { label: "Explain File", action: "aiExplainFile" },
    ],
  },
  {
    label: "AI Refactor", icon: Wand2, action: "aiRefactor",
    submenu: [
      { label: "Improve Readability", action: "aiRefactorReadability" },
      { label: "Optimize Performance", action: "aiRefactorPerformance" },
      { label: "Add Error Handling", action: "aiRefactorErrorHandling" },
      { label: "Add Types", action: "aiRefactorAddTypes" },
      { label: "Simplify Logic", action: "aiRefactorSimplify" },
    ],
  },
];

interface Props {
  x: number;
  y: number;
  onAction: (action: string) => void;
  onClose: () => void;
  hasSelection?: boolean;
}

export function CodeActionsMenu({ x, y, onAction, onClose, hasSelection = false }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const newX = x + rect.width > window.innerWidth ? window.innerWidth - rect.width - 8 : x;
    const newY = y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 8 : y;
    setAdjustedPos({ x: newX, y: newY });
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  const handleAction = useCallback((action: string) => {
    onAction(action);
    onClose();
  }, [onAction, onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-popover border border-border/50 rounded-lg shadow-xl py-1 min-w-[220px] backdrop-blur-sm"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
      data-testid="code-actions-menu"
    >
      {ACTIONS.map((item) => {
        const Icon = item.icon;
        const isDisabled = item.disabled || (!hasSelection && ["cut", "extractFunction", "extractVariable", "formatSelection"].includes(item.action || ""));
        return (
          <div key={item.label}>
            <div
              className={`relative flex items-center gap-2.5 px-3 py-1.5 text-[11px] cursor-pointer ${isDisabled ? "opacity-40 pointer-events-none" : "hover:bg-accent/50"}`}
              onClick={() => !item.submenu && handleAction(item.action || "")}
              onMouseEnter={() => item.submenu && setHoveredSubmenu(item.label)}
              onMouseLeave={() => item.submenu && setHoveredSubmenu(null)}
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="text-[9px] text-muted-foreground ml-4 font-mono">{item.shortcut}</span>}
              {item.submenu && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              {item.submenu && hoveredSubmenu === item.label && (
                <div
                  className="absolute left-full top-0 ml-1 bg-popover border border-border/50 rounded-lg shadow-xl py-1 min-w-[180px] backdrop-blur-sm z-[10000]"
                  onMouseEnter={() => setHoveredSubmenu(item.label)}
                  onMouseLeave={() => setHoveredSubmenu(null)}
                >
                  {item.submenu.map(sub => (
                    <div
                      key={sub.action}
                      className="px-3 py-1.5 text-[11px] cursor-pointer hover:bg-accent/50"
                      onClick={(e) => { e.stopPropagation(); handleAction(sub.action); }}
                    >
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {item.dividerAfter && <div className="my-1 border-t border-border/30" />}
          </div>
        );
      })}
    </div>
  );
}
