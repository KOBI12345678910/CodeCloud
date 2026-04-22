import { useState } from "react";
import FeaturePageLayout from "@/components/FeaturePageLayout";
import { History, RotateCcw, GitCommit, Tag, Bot, Rocket, Save, Clock, ChevronRight, Plus, Minus, FileText, ArrowLeftRight, CheckCircle2 } from "lucide-react";

interface Checkpoint {
  id: string; version: number; title: string; description: string; type: "auto" | "manual" | "deploy" | "ai_agent"; author: string; filesChanged: number; additions: number; deletions: number; createdAt: string; tags: string[];
}

const CHECKPOINTS: Checkpoint[] = [
  { id: "cp_1", version: 28, title: "Deploy to production v2.8", description: "Production deployment with new AI features", type: "deploy", author: "CI/CD Pipeline", filesChanged: 45, additions: 1243, deletions: 389, createdAt: "2026-04-22T15:30:00Z", tags: ["production", "v2.8"] },
  { id: "cp_2", version: 27, title: "Add AI model selector component", description: "New component for selecting AI models with cost estimation", type: "manual", author: "You", filesChanged: 8, additions: 342, deletions: 12, createdAt: "2026-04-22T14:00:00Z", tags: ["feature", "ai"] },
  { id: "cp_3", version: 26, title: "Auto-save checkpoint", description: "Automatic checkpoint before major changes", type: "auto", author: "System", filesChanged: 3, additions: 45, deletions: 12, createdAt: "2026-04-22T12:00:00Z", tags: ["auto"] },
  { id: "cp_4", version: 25, title: "Agent: Refactor billing module", description: "AI agent restructured the billing module for better maintainability", type: "ai_agent", author: "CodeCloud Agent", filesChanged: 12, additions: 567, deletions: 234, createdAt: "2026-04-22T08:00:00Z", tags: ["refactor", "billing"] },
  { id: "cp_5", version: 24, title: "Fix authentication redirect bug", description: "Fixed issue where users were redirected to wrong page after login", type: "manual", author: "You", filesChanged: 2, additions: 15, deletions: 8, createdAt: "2026-04-21T18:00:00Z", tags: ["bugfix", "auth"] },
  { id: "cp_6", version: 23, title: "Deploy to staging", description: "Staging deployment for QA review", type: "deploy", author: "CI/CD Pipeline", filesChanged: 32, additions: 890, deletions: 156, createdAt: "2026-04-21T12:00:00Z", tags: ["staging"] },
  { id: "cp_7", version: 22, title: "Add real-time collaboration", description: "WebSocket-based real-time editing with presence indicators", type: "manual", author: "You", filesChanged: 15, additions: 723, deletions: 45, createdAt: "2026-04-20T15:00:00Z", tags: ["feature", "collaboration"] },
  { id: "cp_8", version: 21, title: "Agent: Generate API documentation", description: "AI agent automatically generated OpenAPI documentation", type: "ai_agent", author: "CodeCloud Agent", filesChanged: 6, additions: 456, deletions: 0, createdAt: "2026-04-19T10:00:00Z", tags: ["docs", "api"] },
  { id: "cp_9", version: 20, title: "Initial project setup", description: "Project created from React + TypeScript template", type: "manual", author: "You", filesChanged: 25, additions: 2345, deletions: 0, createdAt: "2026-04-15T09:00:00Z", tags: ["init"] },
];

const TYPE_CONFIG = {
  auto: { icon: Clock, color: "text-gray-400", bg: "bg-gray-500/20", label: "Auto" },
  manual: { icon: Save, color: "text-blue-400", bg: "bg-blue-500/20", label: "Manual" },
  deploy: { icon: Rocket, color: "text-green-400", bg: "bg-green-500/20", label: "Deploy" },
  ai_agent: { icon: Bot, color: "text-purple-400", bg: "bg-purple-500/20", label: "AI Agent" },
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function VersionHistoryPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);

  const handleSelect = (id: string) => {
    if (compareMode) {
      if (!compareIds[0]) setCompareIds([id, null]);
      else if (!compareIds[1] && id !== compareIds[0]) setCompareIds([compareIds[0], id]);
      else setCompareIds([id, null]);
    } else {
      setSelected(selected === id ? null : id);
    }
  };

  return (
    <FeaturePageLayout title="Version History" description="Track every change with automatic checkpoints and restore any version" icon={<History className="w-7 h-7 text-white" />} badge={`${CHECKPOINTS.length} Checkpoints`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button onClick={() => { setCompareMode(!compareMode); setCompareIds([null, null]); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${compareMode ? "bg-orange-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>
            <ArrowLeftRight className="w-3 h-3" /> Compare
          </button>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors">
          <Save className="w-3 h-3" /> Create Checkpoint
        </button>
      </div>

      {compareMode && compareIds[0] && compareIds[1] && (
        <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
          <p className="text-sm font-medium text-orange-400 mb-2">Comparing v{CHECKPOINTS.find(c => c.id === compareIds[0])?.version} ↔ v{CHECKPOINTS.find(c => c.id === compareIds[1])?.version}</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-lg font-bold text-white">15</p><p className="text-xs text-gray-400">Files Changed</p></div>
            <div><p className="text-lg font-bold text-green-400">+342</p><p className="text-xs text-gray-400">Additions</p></div>
            <div><p className="text-lg font-bold text-red-400">-89</p><p className="text-xs text-gray-400">Deletions</p></div>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-[23px] top-0 bottom-0 w-px bg-white/10" />
        <div className="space-y-3">
          {CHECKPOINTS.map(cp => {
            const config = TYPE_CONFIG[cp.type];
            const Icon = config.icon;
            const isSelected = selected === cp.id;
            const isCompareSelected = compareIds.includes(cp.id);
            return (
              <div key={cp.id} onClick={() => handleSelect(cp.id)} className={`relative pl-12 cursor-pointer group`}>
                <div className={`absolute left-[15px] top-4 w-4 h-4 rounded-full border-2 z-10 transition-all ${isSelected || isCompareSelected ? "border-blue-500 bg-blue-500" : "border-white/20 bg-background group-hover:border-white/40"}`}>
                  {(isSelected || isCompareSelected) && <CheckCircle2 className="w-3 h-3 text-white absolute -top-0.5 -left-0.5" />}
                </div>
                <div className={`p-4 rounded-xl border transition-all ${isSelected || isCompareSelected ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10 hover:bg-white/[0.07]"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center`}><Icon className={`w-3 h-3 ${config.color}`} /></div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>{config.label}</span>
                      <span className="text-xs text-gray-500 font-mono">v{cp.version}</span>
                    </div>
                    <span className="text-xs text-gray-500">{timeAgo(cp.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-white mb-1">{cp.title}</p>
                  <p className="text-xs text-gray-400 mb-2">{cp.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{cp.filesChanged} files</span>
                      <span className="text-green-400 flex items-center gap-0.5"><Plus className="w-3 h-3" />{cp.additions}</span>
                      <span className="text-red-400 flex items-center gap-0.5"><Minus className="w-3 h-3" />{cp.deletions}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cp.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-white/5 text-gray-500 text-[10px] rounded-full">{t}</span>)}
                      {isSelected && !compareMode && (
                        <button onClick={e => { e.stopPropagation(); }} className="flex items-center gap-1 px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-lg">
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </FeaturePageLayout>
  );
}
