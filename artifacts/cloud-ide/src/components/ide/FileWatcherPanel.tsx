import { useState } from "react";
import { Eye, EyeOff, AlertTriangle, FileText, FilePlus, FileX, FileEdit, RefreshCw, Check, X, GitMerge, SkipForward } from "lucide-react";
import type { FileChange, FileConflict, ConflictResolution, WatcherState } from "@/hooks/useFileWatcher";

interface FileWatcherPanelProps {
  watcherState: WatcherState | null;
  recentChanges: FileChange[];
  conflicts: FileConflict[];
  unresolvedConflicts: FileConflict[];
  connected: boolean;
  onStartWatcher: () => void;
  onStopWatcher: () => void;
  onResolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
}

export default function FileWatcherPanel({
  watcherState,
  recentChanges,
  conflicts,
  unresolvedConflicts,
  connected,
  onStartWatcher,
  onStopWatcher,
  onResolveConflict,
}: FileWatcherPanelProps) {
  const [activeTab, setActiveTab] = useState<"changes" | "conflicts">("changes");

  const changeIcon = (type: string) => {
    switch (type) {
      case "created":
        return <FilePlus className="w-3.5 h-3.5 text-green-400" />;
      case "modified":
        return <FileEdit className="w-3.5 h-3.5 text-blue-400" />;
      case "deleted":
        return <FileX className="w-3.5 h-3.5 text-red-400" />;
      case "renamed":
        return <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const sourceColor = (source: string) => {
    switch (source) {
      case "filesystem":
        return "text-purple-400";
      case "editor":
        return "text-blue-400";
      case "git":
        return "text-orange-400";
      case "upload":
        return "text-green-400";
      case "api":
        return "text-cyan-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300 font-medium">File Watcher</span>
          <span
            className={`w-2 h-2 rounded-full ${
              connected && watcherState?.active
                ? "bg-green-500"
                : connected
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          {unresolvedConflicts.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
              <AlertTriangle className="w-3 h-3" />
              {unresolvedConflicts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {watcherState?.active ? (
            <button
              onClick={onStopWatcher}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 rounded"
            >
              <EyeOff className="w-3 h-3" />
              Stop
            </button>
          ) : (
            <button
              onClick={onStartWatcher}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:bg-green-400/10 rounded"
            >
              <Eye className="w-3 h-3" />
              Start
            </button>
          )}
        </div>
      </div>

      {watcherState && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#333] text-xs text-gray-500">
          <span>Changes: {watcherState.totalChanges}</span>
          <span>Pending: {watcherState.pendingChanges}</span>
          <span>Last sync: {formatTime(watcherState.lastSyncAt)}</span>
        </div>
      )}

      <div className="flex border-b border-[#333]">
        <button
          onClick={() => setActiveTab("changes")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium ${
            activeTab === "changes"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Changes ({recentChanges.length})
        </button>
        <button
          onClick={() => setActiveTab("conflicts")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium ${
            activeTab === "conflicts"
              ? "text-yellow-400 border-b-2 border-yellow-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Conflicts ({conflicts.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "changes" && (
          <div>
            {recentChanges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">No recent file changes</span>
              </div>
            ) : (
              recentChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2a2a] border-b border-[#2a2a2a]"
                >
                  {changeIcon(change.changeType)}
                  <span className="flex-1 text-gray-300 truncate font-mono text-xs">
                    {change.filePath}
                  </span>
                  <span className={`text-[10px] ${sourceColor(change.source)}`}>
                    {change.source}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {formatTime(change.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "conflicts" && (
          <div>
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">No conflicts detected</span>
              </div>
            ) : (
              conflicts.map((conflict) => (
                <ConflictItem
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={onResolveConflict}
                  formatTime={formatTime}
                  sourceColor={sourceColor}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConflictItem({
  conflict,
  onResolve,
  formatTime,
  sourceColor,
}: {
  conflict: FileConflict;
  onResolve: (id: string, resolution: ConflictResolution) => void;
  formatTime: (ts: number) => string;
  sourceColor: (source: string) => string;
}) {
  return (
    <div
      className={`px-3 py-2 border-b border-[#2a2a2a] ${
        conflict.resolved ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle
          className={`w-3.5 h-3.5 ${conflict.resolved ? "text-gray-500" : "text-yellow-400"}`}
        />
        <span className="flex-1 text-gray-300 truncate font-mono text-xs">
          {conflict.filePath}
        </span>
        {conflict.resolved && (
          <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
            {conflict.resolution}
          </span>
        )}
      </div>

      <div className="ml-5 space-y-0.5 text-[10px]">
        <div className="flex items-center gap-2 text-gray-500">
          <span>Local:</span>
          <span className={sourceColor(conflict.localChange.source)}>
            {conflict.localChange.source}
          </span>
          <span>{conflict.localChange.changeType}</span>
          <span>{formatTime(conflict.localChange.timestamp)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <span>Remote:</span>
          <span className={sourceColor(conflict.remoteChange.source)}>
            {conflict.remoteChange.source}
          </span>
          <span>{conflict.remoteChange.changeType}</span>
          <span>{formatTime(conflict.remoteChange.timestamp)}</span>
        </div>
      </div>

      {!conflict.resolved && (
        <div className="flex items-center gap-1 ml-5 mt-2">
          <button
            onClick={() => onResolve(conflict.id, "local")}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-blue-400 hover:bg-blue-400/10 rounded"
            title="Keep local changes"
          >
            <Check className="w-3 h-3" />
            Local
          </button>
          <button
            onClick={() => onResolve(conflict.id, "remote")}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-green-400 hover:bg-green-400/10 rounded"
            title="Accept remote changes"
          >
            <X className="w-3 h-3" />
            Remote
          </button>
          <button
            onClick={() => onResolve(conflict.id, "merge")}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-purple-400 hover:bg-purple-400/10 rounded"
            title="Merge both changes"
          >
            <GitMerge className="w-3 h-3" />
            Merge
          </button>
          <button
            onClick={() => onResolve(conflict.id, "skip")}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 hover:bg-gray-400/10 rounded"
            title="Skip this conflict"
          >
            <SkipForward className="w-3 h-3" />
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
