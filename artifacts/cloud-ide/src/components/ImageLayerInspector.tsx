import { useState } from "react";
import { X, Layers, Box, Share2, BarChart3, ChevronDown, ChevronRight, HardDrive } from "lucide-react";

interface Props { projectId: string; onClose: () => void; }

interface ImageLayer {
  id: string;
  command: string;
  size: number;
  cached: boolean;
  shared: boolean;
  sharedWith: string[];
  createdAt: string;
}

interface ContainerImage {
  name: string;
  tag: string;
  totalSize: number;
  layers: ImageLayer[];
  created: string;
}

const formatSize = (bytes: number) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const IMAGES: ContainerImage[] = [
  {
    name: "codecloud/workspace", tag: "latest", totalSize: 856000000, created: new Date(Date.now() - 86400000).toISOString(),
    layers: [
      { id: "sha256:a1b2", command: "FROM node:20-alpine", size: 180000000, cached: true, shared: true, sharedWith: ["codecloud/builder", "codecloud/runner"], createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
      { id: "sha256:c3d4", command: "RUN apk add --no-cache git openssh curl", size: 45000000, cached: true, shared: true, sharedWith: ["codecloud/builder"], createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
      { id: "sha256:e5f6", command: "WORKDIR /app", size: 0, cached: true, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: "sha256:g7h8", command: "COPY package*.json ./", size: 125000, cached: false, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "sha256:i9j0", command: "RUN npm ci --production", size: 320000000, cached: false, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "sha256:k1l2", command: "COPY . .", size: 28000000, cached: false, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "sha256:m3n4", command: "RUN npm run build", size: 275000000, cached: false, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: "sha256:o5p6", command: "CMD [\"node\", \"dist/index.js\"]", size: 0, cached: true, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  },
  {
    name: "codecloud/runner", tag: "v2.1", totalSize: 420000000, created: new Date(Date.now() - 2 * 86400000).toISOString(),
    layers: [
      { id: "sha256:a1b2", command: "FROM node:20-alpine", size: 180000000, cached: true, shared: true, sharedWith: ["codecloud/workspace", "codecloud/builder"], createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
      { id: "sha256:q7r8", command: "RUN apk add --no-cache python3 go", size: 195000000, cached: true, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: "sha256:s9t0", command: "COPY runner.sh /usr/local/bin/", size: 45000, cached: false, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
      { id: "sha256:u1v2", command: "ENTRYPOINT [\"/usr/local/bin/runner.sh\"]", size: 0, cached: true, shared: false, sharedWith: [], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    ],
  },
];

export function ImageLayerInspector({ projectId, onClose }: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);
  const image = IMAGES[selectedImage];
  const cachedLayers = image.layers.filter(l => l.cached).length;
  const sharedLayers = image.layers.filter(l => l.shared).length;
  const cachedSize = image.layers.filter(l => l.cached).reduce((s, l) => s + l.size, 0);
  const maxLayerSize = Math.max(...image.layers.map(l => l.size), 1);

  return (
    <div className="h-full flex flex-col bg-background" data-testid="image-layer-inspector">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Image Layer Inspector</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 shrink-0">
        {IMAGES.map((img, i) => (
          <button key={i} onClick={() => { setSelectedImage(i); setExpandedLayer(null); }} className={`px-2 py-0.5 text-[10px] rounded font-mono ${selectedImage === i ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted/50 border border-transparent"}`}>
            {img.name}:{img.tag}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card/50 rounded border border-border/30 p-2 text-center">
            <HardDrive className="w-3 h-3 mx-auto text-primary mb-0.5" />
            <div className="text-xs font-bold">{formatSize(image.totalSize)}</div>
            <div className="text-[9px] text-muted-foreground">Total Size</div>
          </div>
          <div className="bg-card/50 rounded border border-border/30 p-2 text-center">
            <Box className="w-3 h-3 mx-auto text-blue-400 mb-0.5" />
            <div className="text-xs font-bold">{image.layers.length}</div>
            <div className="text-[9px] text-muted-foreground">Layers</div>
          </div>
          <div className="bg-card/50 rounded border border-border/30 p-2 text-center">
            <BarChart3 className="w-3 h-3 mx-auto text-green-400 mb-0.5" />
            <div className="text-xs font-bold">{cachedLayers}/{image.layers.length}</div>
            <div className="text-[9px] text-muted-foreground">Cached ({formatSize(cachedSize)})</div>
          </div>
          <div className="bg-card/50 rounded border border-border/30 p-2 text-center">
            <Share2 className="w-3 h-3 mx-auto text-purple-400 mb-0.5" />
            <div className="text-xs font-bold">{sharedLayers}</div>
            <div className="text-[9px] text-muted-foreground">Shared Layers</div>
          </div>
        </div>

        <div className="space-y-0.5">
          {image.layers.map((layer, i) => {
            const isExpanded = expandedLayer === layer.id;
            const barWidth = layer.size > 0 ? Math.max(2, (layer.size / maxLayerSize) * 100) : 0;
            return (
              <div key={layer.id} className="bg-card/50 rounded border border-border/30">
                <button onClick={() => setExpandedLayer(isExpanded ? null : layer.id)} className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted/30">
                  {isExpanded ? <ChevronDown className="w-2.5 h-2.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
                  <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-[10px] font-mono flex-1 truncate">{layer.command}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {layer.cached && <span className="text-[8px] px-1 py-px bg-green-400/10 text-green-400 rounded">CACHED</span>}
                    {layer.shared && <span className="text-[8px] px-1 py-px bg-purple-400/10 text-purple-400 rounded">SHARED</span>}
                    <span className="text-[10px] text-muted-foreground w-14 text-right">{layer.size > 0 ? formatSize(layer.size) : "0 B"}</span>
                  </div>
                </button>
                {layer.size > 0 && (
                  <div className="px-2 pb-1"><div className="h-1 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${layer.cached ? "bg-green-400/60" : "bg-primary/60"}`} style={{ width: `${barWidth}%` }} /></div></div>
                )}
                {isExpanded && (
                  <div className="px-3 py-2 border-t border-border/20 space-y-1 text-[10px]">
                    <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Layer ID:</span><span className="font-mono">{layer.id}</span></div>
                    <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Created:</span><span>{new Date(layer.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Cached:</span><span className={layer.cached ? "text-green-400" : "text-muted-foreground"}>{layer.cached ? "Yes" : "No"}</span></div>
                    {layer.shared && layer.sharedWith.length > 0 && (
                      <div className="flex items-start gap-2"><span className="text-muted-foreground w-16">Shared:</span><div className="flex flex-wrap gap-1">{layer.sharedWith.map(s => <span key={s} className="px-1.5 py-0.5 bg-purple-400/10 text-purple-400 rounded font-mono">{s}</span>)}</div></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
