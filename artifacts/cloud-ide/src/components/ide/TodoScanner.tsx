import React, { useState, useMemo } from "react";
import {
  ListTodo, X, File, AlertTriangle, Bug, Wrench,
  Filter, Download, ChevronDown, ChevronRight
} from "lucide-react";

type TodoType = "TODO" | "FIXME" | "HACK" | "BUG" | "NOTE";

interface TodoItem {
  id: string;
  type: TodoType;
  text: string;
  file: string;
  line: number;
  author: string | null;
}

interface TodoScannerProps {
  onClose?: () => void;
  onNavigate?: (file: string, line: number) => void;
}

const SAMPLE_TODOS: TodoItem[] = [
  { id: "t1", type: "TODO", text: "Add pagination to project list", file: "src/pages/dashboard.tsx", line: 45, author: "alice" },
  { id: "t2", type: "FIXME", text: "Race condition in file save", file: "src/hooks/useAutoSave.ts", line: 23, author: "bob" },
  { id: "t3", type: "HACK", text: "Temporary workaround for Monaco editor focus", file: "src/components/Editor.tsx", line: 112, author: null },
  { id: "t4", type: "BUG", text: "Memory leak when switching tabs rapidly", file: "src/components/TabBar.tsx", line: 67, author: "alice" },
  { id: "t5", type: "TODO", text: "Implement file search across workspace", file: "src/services/search.ts", line: 1, author: "charlie" },
  { id: "t6", type: "FIXME", text: "Handle network errors gracefully", file: "src/lib/api.ts", line: 34, author: null },
  { id: "t7", type: "NOTE", text: "This component is deprecated, use NewModal", file: "src/components/Modal.tsx", line: 5, author: "bob" },
  { id: "t8", type: "TODO", text: "Add WebSocket reconnection logic", file: "src/services/ws.ts", line: 89, author: "diana" },
  { id: "t9", type: "HACK", text: "CSS Grid fallback for Safari 14", file: "src/styles/layout.css", line: 156, author: null },
  { id: "t10", type: "BUG", text: "Cursor jumps to end after undo", file: "src/components/Editor.tsx", line: 201, author: "eve" },
];

const TYPE_CONFIG: Record<TodoType, { icon: React.ElementType; color: string; bg: string }> = {
  TODO: { icon: ListTodo, color: "text-blue-400", bg: "bg-blue-500/10" },
  FIXME: { icon: Wrench, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  HACK: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10" },
  BUG: { icon: Bug, color: "text-red-400", bg: "bg-red-500/10" },
  NOTE: { icon: File, color: "text-gray-400", bg: "bg-gray-500/10" },
};

export default function TodoScanner({ onClose, onNavigate }: TodoScannerProps): React.ReactElement {
  const [filter, setFilter] = useState<TodoType | "ALL">("ALL");
  const [groupBy, setGroupBy] = useState<"type" | "file">("type");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["TODO", "FIXME", "HACK", "BUG", "NOTE"]));

  const filtered = useMemo(() => {
    return filter === "ALL" ? SAMPLE_TODOS : SAMPLE_TODOS.filter(t => t.type === filter);
  }, [filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, TodoItem[]> = {};
    for (const item of filtered) {
      const key = groupBy === "type" ? item.type : item.file;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [filtered, groupBy]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const exportList = () => {
    const text = filtered.map(t => `[${t.type}] ${t.file}:${t.line} — ${t.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "todos.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <ListTodo size={14} className="text-blue-400" />
          <span className="text-xs font-medium">TODO Scanner</span>
          <span className="text-[10px] text-gray-500">{filtered.length} items</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={exportList} className="p-1 text-gray-500 hover:text-gray-300" title="Export"><Download size={12} /></button>
          {onClose && <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300"><X size={12} /></button>}
        </div>
      </div>

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#333]">
        <Filter size={10} className="text-gray-600 mr-1" />
        {(["ALL", "TODO", "FIXME", "HACK", "BUG", "NOTE"] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-2 py-0.5 rounded text-[10px] ${filter === t ? "bg-primary/20 text-primary" : "text-gray-500 hover:text-gray-300"}`}>
            {t} {t !== "ALL" && <span className="text-gray-600">({SAMPLE_TODOS.filter(i => i.type === t).length})</span>}
          </button>
        ))}
        <div className="flex-1" />
        <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
          className="bg-[#1e1e1e] text-[10px] text-gray-500 outline-none border border-[#444] rounded px-1">
          <option value="type">Group by Type</option>
          <option value="file">Group by File</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).map(([group, items]) => {
          const config = groupBy === "type" ? TYPE_CONFIG[group as TodoType] : null;
          const Icon = config?.icon || File;
          const isExpanded = expandedGroups.has(group);

          return (
            <div key={group}>
              <button onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2a2d2e] text-left text-[11px] font-medium text-gray-400">
                {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <Icon size={10} className={config?.color || "text-gray-400"} />
                {group} <span className="text-gray-600">({items.length})</span>
              </button>
              {isExpanded && items.map(item => {
                const itemConfig = TYPE_CONFIG[item.type];
                return (
                  <button key={item.id} onClick={() => onNavigate?.(item.file, item.line)}
                    className="w-full flex items-start gap-2 px-5 py-1.5 hover:bg-[#2a2d2e] text-left">
                    <span className={`px-1 py-0 rounded text-[9px] font-bold ${itemConfig.bg} ${itemConfig.color} shrink-0 mt-0.5`}>
                      {item.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 truncate">{item.text}</div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-0.5">
                        <span>{item.file}:{item.line}</span>
                        {item.author && <span>by {item.author}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
