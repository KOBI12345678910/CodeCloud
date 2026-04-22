import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Box, Tag, Layers, Download, Upload, Trash2, Search,
  HardDrive, Clock, RefreshCw, MoreVertical, Copy, Eye, Filter,
  ChevronDown, ChevronRight, AlertTriangle, Check
} from "lucide-react";

interface RegistryImage {
  id: string;
  name: string;
  repository: string;
  tags: ImageTag[];
  totalPulls: number;
  sizeBytes: number;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
}

interface ImageTag {
  name: string;
  digest: string;
  sizeBytes: number;
  layers: ImageLayer[];
  pushedAt: string;
  pullCount: number;
  os: string;
  arch: string;
}

interface ImageLayer {
  digest: string;
  sizeBytes: number;
  command: string;
  createdAt: string;
}

const SAMPLE_IMAGES: RegistryImage[] = [
  {
    id: "img1", name: "web-app", repository: "codecloud/web-app",
    totalPulls: 14523, sizeBytes: 245000000, visibility: "private",
    createdAt: "2025-06-15T10:00:00Z", updatedAt: "2026-04-14T08:30:00Z",
    tags: [
      {
        name: "latest", digest: "sha256:a1b2c3d4e5f6", sizeBytes: 82000000,
        pushedAt: "2026-04-14T08:30:00Z", pullCount: 5230, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base001", sizeBytes: 28000000, command: "FROM node:20-alpine", createdAt: "2026-04-14T08:28:00Z" },
          { digest: "sha256:deps002", sizeBytes: 35000000, command: "RUN npm ci --production", createdAt: "2026-04-14T08:29:00Z" },
          { digest: "sha256:app003", sizeBytes: 12000000, command: "COPY . /app", createdAt: "2026-04-14T08:29:30Z" },
          { digest: "sha256:cfg004", sizeBytes: 4500000, command: "RUN npm run build", createdAt: "2026-04-14T08:30:00Z" },
          { digest: "sha256:cmd005", sizeBytes: 2500000, command: 'CMD ["node", "dist/index.js"]', createdAt: "2026-04-14T08:30:00Z" },
        ],
      },
      {
        name: "v2.3.1", digest: "sha256:a1b2c3d4e5f6", sizeBytes: 82000000,
        pushedAt: "2026-04-14T08:30:00Z", pullCount: 1820, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base001", sizeBytes: 28000000, command: "FROM node:20-alpine", createdAt: "2026-04-14T08:28:00Z" },
          { digest: "sha256:deps002", sizeBytes: 35000000, command: "RUN npm ci --production", createdAt: "2026-04-14T08:29:00Z" },
          { digest: "sha256:app003", sizeBytes: 12000000, command: "COPY . /app", createdAt: "2026-04-14T08:29:30Z" },
          { digest: "sha256:cfg004", sizeBytes: 4500000, command: "RUN npm run build", createdAt: "2026-04-14T08:30:00Z" },
          { digest: "sha256:cmd005", sizeBytes: 2500000, command: 'CMD ["node", "dist/index.js"]', createdAt: "2026-04-14T08:30:00Z" },
        ],
      },
      {
        name: "v2.3.0", digest: "sha256:f6e5d4c3b2a1", sizeBytes: 79000000,
        pushedAt: "2026-04-10T14:20:00Z", pullCount: 3410, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base001", sizeBytes: 28000000, command: "FROM node:20-alpine", createdAt: "2026-04-10T14:18:00Z" },
          { digest: "sha256:deps006", sizeBytes: 33000000, command: "RUN npm ci --production", createdAt: "2026-04-10T14:19:00Z" },
          { digest: "sha256:app007", sizeBytes: 11500000, command: "COPY . /app", createdAt: "2026-04-10T14:19:30Z" },
          { digest: "sha256:cfg008", sizeBytes: 4200000, command: "RUN npm run build", createdAt: "2026-04-10T14:20:00Z" },
          { digest: "sha256:cmd005", sizeBytes: 2300000, command: 'CMD ["node", "dist/index.js"]', createdAt: "2026-04-10T14:20:00Z" },
        ],
      },
      {
        name: "v2.2.0", digest: "sha256:112233445566", sizeBytes: 76000000,
        pushedAt: "2026-03-25T09:10:00Z", pullCount: 4063, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base009", sizeBytes: 27000000, command: "FROM node:18-alpine", createdAt: "2026-03-25T09:08:00Z" },
          { digest: "sha256:deps010", sizeBytes: 32000000, command: "RUN npm ci --production", createdAt: "2026-03-25T09:09:00Z" },
          { digest: "sha256:app011", sizeBytes: 11000000, command: "COPY . /app", createdAt: "2026-03-25T09:09:30Z" },
          { digest: "sha256:cmd012", sizeBytes: 6000000, command: "RUN npm run build && CMD node dist/index.js", createdAt: "2026-03-25T09:10:00Z" },
        ],
      },
    ],
  },
  {
    id: "img2", name: "api-server", repository: "codecloud/api-server",
    totalPulls: 9871, sizeBytes: 198000000, visibility: "private",
    createdAt: "2025-08-20T12:00:00Z", updatedAt: "2026-04-13T16:45:00Z",
    tags: [
      {
        name: "latest", digest: "sha256:bb11cc22dd33", sizeBytes: 95000000,
        pushedAt: "2026-04-13T16:45:00Z", pullCount: 3200, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base020", sizeBytes: 32000000, command: "FROM node:20-slim", createdAt: "2026-04-13T16:43:00Z" },
          { digest: "sha256:deps021", sizeBytes: 42000000, command: "RUN npm ci", createdAt: "2026-04-13T16:44:00Z" },
          { digest: "sha256:app022", sizeBytes: 15000000, command: "COPY . /api", createdAt: "2026-04-13T16:44:30Z" },
          { digest: "sha256:cmd023", sizeBytes: 6000000, command: 'CMD ["node", "src/index.js"]', createdAt: "2026-04-13T16:45:00Z" },
        ],
      },
      {
        name: "v1.8.0", digest: "sha256:bb11cc22dd33", sizeBytes: 95000000,
        pushedAt: "2026-04-13T16:45:00Z", pullCount: 2100, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base020", sizeBytes: 32000000, command: "FROM node:20-slim", createdAt: "2026-04-13T16:43:00Z" },
          { digest: "sha256:deps021", sizeBytes: 42000000, command: "RUN npm ci", createdAt: "2026-04-13T16:44:00Z" },
          { digest: "sha256:app022", sizeBytes: 15000000, command: "COPY . /api", createdAt: "2026-04-13T16:44:30Z" },
          { digest: "sha256:cmd023", sizeBytes: 6000000, command: 'CMD ["node", "src/index.js"]', createdAt: "2026-04-13T16:45:00Z" },
        ],
      },
    ],
  },
  {
    id: "img3", name: "worker", repository: "codecloud/worker",
    totalPulls: 6340, sizeBytes: 310000000, visibility: "private",
    createdAt: "2025-10-05T08:00:00Z", updatedAt: "2026-04-12T11:20:00Z",
    tags: [
      {
        name: "latest", digest: "sha256:ee44ff55aa66", sizeBytes: 155000000,
        pushedAt: "2026-04-12T11:20:00Z", pullCount: 2840, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base030", sizeBytes: 45000000, command: "FROM python:3.12-slim", createdAt: "2026-04-12T11:17:00Z" },
          { digest: "sha256:deps031", sizeBytes: 68000000, command: "RUN pip install -r requirements.txt", createdAt: "2026-04-12T11:18:00Z" },
          { digest: "sha256:app032", sizeBytes: 25000000, command: "COPY . /worker", createdAt: "2026-04-12T11:19:00Z" },
          { digest: "sha256:cfg033", sizeBytes: 12000000, command: "RUN python setup.py install", createdAt: "2026-04-12T11:19:30Z" },
          { digest: "sha256:cmd034", sizeBytes: 5000000, command: 'ENTRYPOINT ["python", "-m", "worker"]', createdAt: "2026-04-12T11:20:00Z" },
        ],
      },
      {
        name: "v3.1.0", digest: "sha256:ee44ff55aa66", sizeBytes: 155000000,
        pushedAt: "2026-04-12T11:20:00Z", pullCount: 1500, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base030", sizeBytes: 45000000, command: "FROM python:3.12-slim", createdAt: "2026-04-12T11:17:00Z" },
          { digest: "sha256:deps031", sizeBytes: 68000000, command: "RUN pip install -r requirements.txt", createdAt: "2026-04-12T11:18:00Z" },
          { digest: "sha256:app032", sizeBytes: 25000000, command: "COPY . /worker", createdAt: "2026-04-12T11:19:00Z" },
          { digest: "sha256:cfg033", sizeBytes: 12000000, command: "RUN python setup.py install", createdAt: "2026-04-12T11:19:30Z" },
          { digest: "sha256:cmd034", sizeBytes: 5000000, command: 'ENTRYPOINT ["python", "-m", "worker"]', createdAt: "2026-04-12T11:20:00Z" },
        ],
      },
    ],
  },
  {
    id: "img4", name: "nginx-proxy", repository: "codecloud/nginx-proxy",
    totalPulls: 18200, sizeBytes: 45000000, visibility: "public",
    createdAt: "2025-04-01T06:00:00Z", updatedAt: "2026-04-11T09:00:00Z",
    tags: [
      {
        name: "latest", digest: "sha256:99aabb00cc11", sizeBytes: 22000000,
        pushedAt: "2026-04-11T09:00:00Z", pullCount: 8900, os: "linux", arch: "amd64",
        layers: [
          { digest: "sha256:base040", sizeBytes: 12000000, command: "FROM nginx:1.25-alpine", createdAt: "2026-04-11T08:58:00Z" },
          { digest: "sha256:cfg041", sizeBytes: 5000000, command: "COPY nginx.conf /etc/nginx/nginx.conf", createdAt: "2026-04-11T08:59:00Z" },
          { digest: "sha256:ssl042", sizeBytes: 3000000, command: "COPY certs/ /etc/nginx/certs/", createdAt: "2026-04-11T08:59:30Z" },
          { digest: "sha256:cmd043", sizeBytes: 2000000, command: 'CMD ["nginx", "-g", "daemon off;"]', createdAt: "2026-04-11T09:00:00Z" },
        ],
      },
    ],
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ImageRegistry(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<RegistryImage | null>(null);
  const [selectedTag, setSelectedTag] = useState<ImageTag | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all");
  const [sortBy, setSortBy] = useState<"name" | "updated" | "size" | "pulls">("updated");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

  const filteredImages = useMemo(() => {
    let imgs = SAMPLE_IMAGES.filter(img =>
      img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.repository.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (visibilityFilter !== "all") {
      imgs = imgs.filter(img => img.visibility === visibilityFilter);
    }
    return imgs.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "updated": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "size": return b.sizeBytes - a.sizeBytes;
        case "pulls": return b.totalPulls - a.totalPulls;
        default: return 0;
      }
    });
  }, [searchQuery, visibilityFilter, sortBy]);

  const totalStorage = SAMPLE_IMAGES.reduce((s, img) => s + img.sizeBytes, 0);
  const totalImages = SAMPLE_IMAGES.length;
  const totalTags = SAMPLE_IMAGES.reduce((s, img) => s + img.tags.length, 0);

  const copyDigest = (digest: string) => {
    navigator.clipboard.writeText(digest);
    setCopiedDigest(digest);
    setTimeout(() => setCopiedDigest(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-200">
      <div className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2"><Box size={22} className="text-purple-400" /> Image Registry</h1>
                <p className="text-xs text-gray-500 mt-0.5">Browse, manage and deploy container images</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                <Upload size={14} /> Push Image
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Images", value: totalImages, icon: Box, color: "text-purple-400" },
            { label: "Total Tags", value: totalTags, icon: Tag, color: "text-blue-400" },
            { label: "Storage Used", value: formatBytes(totalStorage), icon: HardDrive, color: "text-amber-400" },
            { label: "Total Pulls", value: SAMPLE_IMAGES.reduce((s, i) => s + i.totalPulls, 0).toLocaleString(), icon: Download, color: "text-green-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={14} className={stat.color} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search images..." className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500/50 focus:outline-none" />
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <Filter size={12} className="text-gray-500 ml-2" />
            {(["all", "public", "private"] as const).map(v => (
              <button key={v} onClick={() => setVisibilityFilter(v)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${visibilityFilter === v ? "bg-purple-600/30 text-purple-300" : "text-gray-400 hover:text-gray-200"}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none">
            <option value="updated">Recently Updated</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="pulls">Most Pulled</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredImages.map(img => (
            <div key={img.id} className={`bg-white/5 border rounded-xl overflow-hidden transition-all ${selectedImage?.id === img.id ? "border-purple-500/50 bg-purple-500/5" : "border-white/10 hover:border-white/20"}`}>
              <div className="p-4 cursor-pointer" onClick={() => { setSelectedImage(selectedImage?.id === img.id ? null : img); setSelectedTag(null); setShowLayers(false); }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                      <Box size={20} className="text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{img.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${img.visibility === "public" ? "bg-green-600/20 text-green-400" : "bg-gray-600/20 text-gray-400"}`}>{img.visibility}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{img.repository}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-gray-400">
                    <div className="flex items-center gap-1" title="Tags"><Tag size={12} /> {img.tags.length}</div>
                    <div className="flex items-center gap-1" title="Storage"><HardDrive size={12} /> {formatBytes(img.sizeBytes)}</div>
                    <div className="flex items-center gap-1" title="Pulls"><Download size={12} /> {img.totalPulls.toLocaleString()}</div>
                    <div className="flex items-center gap-1" title="Updated"><Clock size={12} /> {timeAgo(img.updatedAt)}</div>
                    {selectedImage?.id === img.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>
              </div>

              {selectedImage?.id === img.id && (
                <div className="border-t border-white/10">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-300">Tags ({img.tags.length})</span>
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/5">
                          <RefreshCw size={12} /> Refresh
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {img.tags.map(tag => (
                        <div key={tag.name}
                          className={`rounded-lg border p-3 cursor-pointer transition-all ${selectedTag?.name === tag.name ? "border-purple-500/50 bg-purple-500/5" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}
                          onClick={() => { setSelectedTag(selectedTag?.name === tag.name ? null : tag); setShowLayers(false); }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Tag size={14} className={tag.name === "latest" ? "text-green-400" : "text-blue-400"} />
                              <span className="text-sm font-mono text-white">{tag.name}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{tag.digest.slice(0, 19)}</span>
                              <button onClick={e => { e.stopPropagation(); copyDigest(tag.digest); }}
                                className="p-0.5 rounded text-gray-600 hover:text-gray-300" title="Copy digest">
                                {copiedDigest === tag.digest ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                              </button>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span>{formatBytes(tag.sizeBytes)}</span>
                              <span>{tag.os}/{tag.arch}</span>
                              <span>{tag.layers.length} layers</span>
                              <span className="flex items-center gap-1"><Download size={11} /> {tag.pullCount.toLocaleString()}</span>
                              <span>{timeAgo(tag.pushedAt)}</span>
                              <div className="flex items-center gap-1">
                                <button className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-blue-400" title="Pull">
                                  <Download size={13} />
                                </button>
                                <button onClick={e => { e.stopPropagation(); setShowLayers(!showLayers); }}
                                  className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-purple-400" title="View layers">
                                  <Layers size={13} />
                                </button>
                                {tag.name !== "latest" && (
                                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm(tag.name); }}
                                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-red-400" title="Delete tag">
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {selectedTag?.name === tag.name && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                              <div className="bg-gray-900/50 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                                  <Download size={12} /> Pull Command
                                </div>
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 text-xs font-mono text-green-300 bg-black/30 rounded px-3 py-1.5">
                                    docker pull {img.repository}:{tag.name}
                                  </code>
                                  <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`docker pull ${img.repository}:${tag.name}`); }}
                                    className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                                    <Copy size={12} />
                                  </button>
                                </div>
                              </div>

                              {showLayers && (
                                <div>
                                  <div className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                                    <Layers size={12} /> Image Layers ({tag.layers.length})
                                  </div>
                                  <div className="space-y-1">
                                    {tag.layers.map((layer, i) => {
                                      const pct = (layer.sizeBytes / tag.sizeBytes) * 100;
                                      return (
                                        <div key={layer.digest} className="flex items-center gap-3 p-2 rounded bg-black/20 border border-white/5">
                                          <span className="text-[10px] text-gray-600 w-4 text-right">{i + 1}</span>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <code className="text-xs font-mono text-gray-300 truncate">{layer.command}</code>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                              <span className="text-[10px] text-gray-600 font-mono">{layer.digest.slice(0, 19)}</span>
                                              <span className="text-[10px] text-gray-500">{timeAgo(layer.createdAt)}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                              <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[10px] text-gray-400 w-14 text-right">{formatBytes(layer.sizeBytes)}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {deleteConfirm === tag.name && (
                            <div className="mt-3 pt-3 border-t border-white/5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                <div className="flex-1">
                                  <div className="text-xs text-red-300 font-medium">Delete tag "{tag.name}"?</div>
                                  <div className="text-[10px] text-red-400/70">This action cannot be undone. Existing deployments using this tag will fail.</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs rounded bg-white/5 text-gray-300 hover:bg-white/10">Cancel</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/10 px-4 py-3 bg-white/[0.02]">
                    <div className="text-xs text-gray-500 mb-2">Storage Breakdown</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden flex">
                        {img.tags.map((tag, i) => {
                          const pct = (tag.sizeBytes / img.sizeBytes) * 100;
                          const colors = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-amber-500", "bg-pink-500"];
                          return <div key={tag.name} className={`h-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} title={`${tag.name}: ${formatBytes(tag.sizeBytes)}`} />;
                        })}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatBytes(img.sizeBytes)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {img.tags.map((tag, i) => {
                        const colors = ["text-purple-400", "text-blue-400", "text-green-400", "text-amber-400", "text-pink-400"];
                        const dots = ["bg-purple-400", "bg-blue-400", "bg-green-400", "bg-amber-400", "bg-pink-400"];
                        return (
                          <span key={tag.name} className="flex items-center gap-1 text-[10px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${dots[i % dots.length]}`} />
                            <span className={colors[i % colors.length]}>{tag.name}</span>
                            <span className="text-gray-600">{formatBytes(tag.sizeBytes)}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="text-center py-16">
            <Box size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500">No images found</p>
            <p className="text-xs text-gray-600 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
