import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, Keyboard, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "save", keys: ["Ctrl", "S"], description: "Save current file", category: "Editor" },
  { id: "undo", keys: ["Ctrl", "Z"], description: "Undo", category: "Editor" },
  { id: "redo", keys: ["Ctrl", "Shift", "Z"], description: "Redo", category: "Editor" },
  { id: "find", keys: ["Ctrl", "F"], description: "Find in file", category: "Editor" },
  { id: "replace", keys: ["Ctrl", "H"], description: "Find and replace", category: "Editor" },
  { id: "format", keys: ["Shift", "Alt", "F"], description: "Format document", category: "Editor" },
  { id: "comment-line", keys: ["Ctrl", "/"], description: "Toggle line comment", category: "Editor" },
  { id: "comment-block", keys: ["Shift", "Alt", "A"], description: "Toggle block comment", category: "Editor" },
  { id: "duplicate-line", keys: ["Shift", "Alt", "↓"], description: "Duplicate line down", category: "Editor" },
  { id: "move-line-up", keys: ["Alt", "↑"], description: "Move line up", category: "Editor" },
  { id: "move-line-down", keys: ["Alt", "↓"], description: "Move line down", category: "Editor" },
  { id: "select-all", keys: ["Ctrl", "A"], description: "Select all", category: "Editor" },
  { id: "multi-cursor", keys: ["Alt", "Click"], description: "Add cursor", category: "Editor" },
  { id: "select-word", keys: ["Ctrl", "D"], description: "Select word / next occurrence", category: "Editor" },
  { id: "go-to-line", keys: ["Ctrl", "G"], description: "Go to line", category: "Editor" },
  { id: "fold", keys: ["Ctrl", "Shift", "["], description: "Fold region", category: "Editor" },
  { id: "unfold", keys: ["Ctrl", "Shift", "]"], description: "Unfold region", category: "Editor" },
  { id: "split-editor", keys: ["Ctrl", "\\"], description: "Split editor", category: "Editor" },

  { id: "command-palette", keys: ["Ctrl", "Shift", "P"], description: "Open command palette", category: "Navigation" },
  { id: "quick-open", keys: ["Ctrl", "P"], description: "Quick open file", category: "Navigation" },
  { id: "global-search", keys: ["Ctrl", "Shift", "F"], description: "Search across files", category: "Navigation" },
  { id: "close-tab", keys: ["Ctrl", "W"], description: "Close current tab", category: "Navigation" },
  { id: "next-tab", keys: ["Ctrl", "Tab"], description: "Next tab", category: "Navigation" },
  { id: "prev-tab", keys: ["Ctrl", "Shift", "Tab"], description: "Previous tab", category: "Navigation" },
  { id: "sidebar-toggle", keys: ["Ctrl", "B"], description: "Toggle sidebar", category: "Navigation" },
  { id: "go-to-definition", keys: ["F12"], description: "Go to definition", category: "Navigation" },
  { id: "peek-definition", keys: ["Alt", "F12"], description: "Peek definition", category: "Navigation" },
  { id: "breadcrumb", keys: ["Ctrl", "Shift", "."], description: "Focus breadcrumb", category: "Navigation" },

  { id: "new-terminal", keys: ["Ctrl", "`"], description: "Toggle terminal", category: "Terminal" },
  { id: "new-terminal-tab", keys: ["Ctrl", "Shift", "`"], description: "New terminal tab", category: "Terminal" },
  { id: "clear-terminal", keys: ["Ctrl", "K"], description: "Clear terminal", category: "Terminal" },
  { id: "terminal-search", keys: ["Ctrl", "Shift", "F"], description: "Search in terminal", category: "Terminal" },
  { id: "kill-terminal", keys: ["Ctrl", "C"], description: "Kill process", category: "Terminal" },

  { id: "run-project", keys: ["F5"], description: "Run project", category: "IDE" },
  { id: "stop-project", keys: ["Shift", "F5"], description: "Stop project", category: "IDE" },
  { id: "shortcuts-help", keys: ["Ctrl", "Shift", "?"], description: "Show keyboard shortcuts", category: "IDE" },
  { id: "settings", keys: ["Ctrl", ","], description: "Open settings", category: "IDE" },
  { id: "toggle-theme", keys: ["Ctrl", "Shift", "T"], description: "Toggle dark/light theme", category: "IDE" },
  { id: "zoom-in", keys: ["Ctrl", "+"], description: "Zoom in", category: "IDE" },
  { id: "zoom-out", keys: ["Ctrl", "-"], description: "Zoom out", category: "IDE" },
  { id: "zoom-reset", keys: ["Ctrl", "0"], description: "Reset zoom", category: "IDE" },
  { id: "feedback", keys: ["Ctrl", "Shift", "I"], description: "Send feedback", category: "IDE" },
  { id: "ai-chat", keys: ["Ctrl", "Shift", "A"], description: "Toggle AI chat", category: "IDE" },
];

const CATEGORIES = ["Editor", "Navigation", "Terminal", "IDE"];

const CATEGORY_COLORS: Record<string, string> = {
  Editor: "text-blue-400",
  Navigation: "text-emerald-400",
  Terminal: "text-orange-400",
  IDE: "text-purple-400",
};

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((key, i) => (
        <span key={i}>
          {i > 0 && <span className="text-muted-foreground/30 mx-0.5">+</span>}
          <kbd className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded border border-border/50 bg-muted/40 text-[10px] font-mono font-medium text-foreground/80 shadow-sm">
            {key}
          </kbd>
        </span>
      ))}
    </div>
  );
}

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("codecloud-custom-shortcuts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (Object.keys(customShortcuts).length > 0) {
      localStorage.setItem("codecloud-custom-shortcuts", JSON.stringify(customShortcuts));
    }
  }, [customShortcuts]);

  const shortcuts = useMemo(() => {
    return DEFAULT_SHORTCUTS.map((s) => ({
      ...s,
      keys: customShortcuts[s.id] || s.keys,
      isCustom: !!customShortcuts[s.id],
    }));
  }, [customShortcuts]);

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery) return shortcuts;
    const q = searchQuery.toLowerCase();
    return shortcuts.filter(
      (s) => s.description.toLowerCase().includes(q) ||
        s.keys.join(" ").toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [shortcuts, searchQuery]);

  const groupedShortcuts = useMemo(() => {
    const groups: Record<string, typeof filteredShortcuts> = {};
    for (const cat of CATEGORIES) {
      const items = filteredShortcuts.filter((s) => s.category === cat);
      if (items.length > 0) groups[cat] = items;
    }
    return groups;
  }, [filteredShortcuts]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editingId) return;
    e.preventDefault();
    e.stopPropagation();

    const key = e.key;
    if (key === "Escape") {
      setEditingId(null);
      setRecordedKeys([]);
      return;
    }
    if (key === "Enter" && recordedKeys.length > 0) {
      setCustomShortcuts((prev) => ({ ...prev, [editingId]: recordedKeys }));
      setEditingId(null);
      setRecordedKeys([]);
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.altKey) modifiers.push("Alt");

    const keyName = key.length === 1 ? key.toUpperCase() : key;
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
      setRecordedKeys([...modifiers, keyName]);
    }
  }, [editingId, recordedKeys]);

  const resetShortcut = useCallback((id: string) => {
    setCustomShortcuts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setCustomShortcuts({});
    localStorage.removeItem("codecloud-custom-shortcuts");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0" onKeyDown={handleKeyDown}>
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 border-b border-border/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="pl-9 h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(cat)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                    searchQuery === cat
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {Object.keys(customShortcuts).length > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={resetAll}>
                <RotateCcw className="w-2.5 h-2.5 mr-1" />
                Reset All
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category} className="mb-5 last:mb-0">
              <h3 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${CATEGORY_COLORS[category] || ""}`}>
                {category}
              </h3>
              <div className="space-y-0.5">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 group"
                  >
                    <span className="text-xs text-foreground/80">{shortcut.description}</span>
                    <div className="flex items-center gap-2">
                      {shortcut.isCustom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={() => resetShortcut(shortcut.id)}
                          title="Reset to default"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                        </Button>
                      )}
                      {editingId === shortcut.id ? (
                        <div className="flex items-center gap-1">
                          {recordedKeys.length > 0 ? (
                            <KeyCombo keys={recordedKeys} />
                          ) : (
                            <span className="text-[10px] text-muted-foreground animate-pulse">Press keys...</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => { setEditingId(null); setRecordedKeys([]); }}
                          >
                            <X className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(shortcut.id); setRecordedKeys([]); }}
                          className="opacity-80 hover:opacity-100 transition-opacity"
                          title="Click to customize"
                        >
                          <KeyCombo keys={shortcut.keys} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedShortcuts).length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
              No shortcuts matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>

        <div className="px-5 py-2 border-t border-border/50 bg-muted/10">
          <p className="text-[10px] text-muted-foreground">
            Click any shortcut to customize it. Press the new key combination then Enter to save, or Escape to cancel.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
