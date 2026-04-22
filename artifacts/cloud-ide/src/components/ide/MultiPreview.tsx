import { useState, useCallback, useRef } from "react";
import {
  X, Plus, Monitor, Tablet, Smartphone, RefreshCw,
  ExternalLink, Globe, ChevronLeft, ChevronRight,
  RotateCcw, Lock, Unlock, Maximize2, Minimize2,
} from "lucide-react";

type ViewportSize = "desktop" | "tablet" | "mobile";

interface PreviewTab {
  id: string;
  label: string;
  url: string;
  port: number;
  viewport: ViewportSize;
  locked: boolean;
}

interface Props {
  projectName?: string;
  deployedUrl?: string;
  containerRunning: boolean;
  srcDoc?: string;
}

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; height: string; label: string }> = {
  desktop: { width: "100%", height: "100%", label: "Desktop" },
  tablet: { width: "768px", height: "1024px", label: "Tablet (768×1024)" },
  mobile: { width: "375px", height: "667px", label: "Mobile (375×667)" },
};

let nextTabId = 1;

function createTab(port = 3000, label?: string): PreviewTab {
  const id = `preview-${nextTabId++}`;
  return {
    id,
    label: label || `Port ${port}`,
    url: `localhost:${port}`,
    port,
    viewport: "desktop",
    locked: false,
  };
}

export function MultiPreview({ projectName, deployedUrl, containerRunning, srcDoc }: Props) {
  const [tabs, setTabs] = useState<PreviewTab[]>([createTab(3000, "Main")]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [editingUrl, setEditingUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const addTab = useCallback(() => {
    const usedPorts = tabs.map(t => t.port);
    let newPort = 3000;
    while (usedPorts.includes(newPort)) newPort++;
    const tab = createTab(newPort);
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [tabs]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(t => t.id === tabId);
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next[Math.min(idx, next.length - 1)].id);
      }
      return next;
    });
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, updates: Partial<PreviewTab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  }, []);

  const setViewport = useCallback((viewport: ViewportSize) => {
    updateTab(activeTabId, { viewport });
  }, [activeTabId, updateTab]);

  const refreshTab = useCallback(() => {
    const iframe = iframeRefs.current[activeTabId];
    if (iframe) {
      try { iframe.contentWindow?.location.reload(); } catch { iframe.src = iframe.src; }
    }
  }, [activeTabId]);

  const startUrlEdit = () => {
    setEditingUrl(activeTabId);
    setUrlInput(activeTab.url);
  };

  const submitUrl = () => {
    if (editingUrl && urlInput.trim()) {
      let url = urlInput.trim();
      const portMatch = url.match(/^(?:localhost:)?(\d+)(\/.*)?$/);
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        updateTab(editingUrl, {
          url: `localhost:${port}${portMatch[2] || ""}`,
          port,
          label: `Port ${port}`,
        });
      } else {
        if (!url.startsWith("http")) url = `https://${url}`;
        updateTab(editingUrl, { url, label: new URL(url).hostname });
      }
    }
    setEditingUrl(null);
  };

  const vpSize = VIEWPORT_SIZES[activeTab.viewport];

  return (
    <div className={`h-full flex flex-col border-l border-border/50 ${isFullscreen ? "fixed inset-0 z-50 bg-background" : ""}`} data-testid="multi-preview">
      <div className="h-7 flex items-center px-3 border-b border-border/30 bg-card/30 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</span>
      </div>
      <div className="h-8 flex items-center justify-between border-b border-border/30 bg-card/30 shrink-0">
        <div className="flex items-center overflow-x-auto flex-1 min-w-0">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-2.5 h-full text-[11px] cursor-pointer border-r border-border/20 shrink-0 transition-colors ${
                activeTabId === tab.id
                  ? "bg-background text-foreground border-b-2 border-b-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              onClick={() => setActiveTabId(tab.id)}
              data-testid={`preview-tab-${tab.id}`}
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[80px]">{tab.label}</span>
              {tab.locked && <Lock className="w-2.5 h-2.5 text-yellow-400" />}
              {tabs.length > 1 && (
                <button
                  className="ml-0.5 p-0.5 rounded hover:bg-muted/50"
                  onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addTab}
            className="px-2 h-full text-muted-foreground hover:text-foreground hover:bg-muted/30 shrink-0"
            title="New preview tab"
            data-testid="add-preview-tab"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-0.5 px-1.5 shrink-0">
          {(["desktop", "tablet", "mobile"] as ViewportSize[]).map(vp => {
            const Icon = vp === "desktop" ? Monitor : vp === "tablet" ? Tablet : Smartphone;
            return (
              <button
                key={vp}
                onClick={() => setViewport(vp)}
                className={`p-1 rounded transition-colors ${
                  activeTab.viewport === vp ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={VIEWPORT_SIZES[vp].label}
                data-testid={`viewport-${vp}`}
              >
                <Icon className="w-3 h-3" />
              </button>
            );
          })}
          <div className="w-px h-4 bg-border/50 mx-0.5" />
          <button
            onClick={refreshTab}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Refresh"
            data-testid="refresh-preview"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={() => updateTab(activeTabId, { locked: !activeTab.locked })}
            className={`p-1 rounded ${activeTab.locked ? "text-yellow-400" : "text-muted-foreground hover:text-foreground"} hover:bg-muted`}
            title={activeTab.locked ? "Unlock navigation" : "Lock navigation"}
          >
            {activeTab.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2 py-1 border-b border-border/20 bg-card/20 shrink-0">
        <button
          onClick={() => {
            const iframe = iframeRefs.current[activeTabId];
            if (iframe) try { iframe.contentWindow?.history.back(); } catch {}
          }}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Back"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            const iframe = iframeRefs.current[activeTabId];
            if (iframe) try { iframe.contentWindow?.history.forward(); } catch {}
          }}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Forward"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={refreshTab} className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Reload">
          <RotateCcw className="w-3 h-3" />
        </button>

        {editingUrl === activeTabId ? (
          <form className="flex-1 flex items-center" onSubmit={e => { e.preventDefault(); submitUrl(); }}>
            <input
              autoFocus
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onBlur={submitUrl}
              className="flex-1 bg-background border border-primary/50 rounded px-2 py-0.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="localhost:3000 or URL..."
              data-testid="url-input"
            />
          </form>
        ) : (
          <div
            onClick={startUrlEdit}
            className="flex-1 flex items-center bg-muted/30 rounded px-2 py-0.5 text-xs text-muted-foreground font-mono cursor-text hover:bg-muted/50 transition-colors"
            data-testid="url-bar"
          >
            <Globe className="w-3 h-3 mr-1.5 shrink-0" />
            <span className="truncate">{activeTab.url}</span>
          </div>
        )}

        {deployedUrl && (
          <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Open in new window">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center bg-muted/20 overflow-hidden" data-testid="preview-area">
        <div
          className="bg-background overflow-hidden transition-all"
          style={{
            width: vpSize.width,
            height: vpSize.height,
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          {containerRunning && srcDoc ? (
            <iframe
              ref={el => { iframeRefs.current[activeTabId] = el; }}
              srcDoc={srcDoc}
              title="Live Preview"
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
              className="w-full h-full bg-white border-0"
              data-testid="preview-iframe"
            />
          ) : containerRunning ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">Live Preview</h2>
                <p className="text-sm text-muted-foreground mt-1">No HTML entry file found</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Monitor className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click Run to start preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="h-5 border-t border-border/30 flex items-center px-2 gap-3 text-[10px] text-muted-foreground bg-card/20 shrink-0">
          <span>{tabs.length} tabs</span>
          <span>Active: {activeTab.label}</span>
          <span>{VIEWPORT_SIZES[activeTab.viewport].label}</span>
        </div>
      )}
    </div>
  );
}
