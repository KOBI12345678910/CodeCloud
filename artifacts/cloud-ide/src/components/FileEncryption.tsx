import { useState, useEffect } from "react";
import { X, Lock, Unlock, Key, Shield, Loader2, RefreshCw, FileText, AlertTriangle } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;
interface Props { projectId: string; onClose: () => void; }

const formatSize = (bytes: number) => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

export function FileEncryption({ projectId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [encrypting, setEncrypting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try { const res = await fetch(`${API}/projects/${projectId}/encryption`, { credentials: "include" }); if (res.ok) setData(await res.json()); } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const toggleEncrypt = async (path: string, isEncrypted: boolean) => {
    setEncrypting(path);
    try {
      const endpoint = isEncrypted ? "decrypt" : "encrypt";
      await fetch(`${API}/projects/${projectId}/encryption/${endpoint}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: path }),
      });
      const res = await fetch(`${API}/projects/${projectId}/encryption`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch {} finally { setEncrypting(null); }
  };

  const rotateKey = async (keyId: string) => {
    try {
      await fetch(`${API}/projects/${projectId}/encryption/rotate-key`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
    } catch {}
  };

  return (
    <div className="h-full flex flex-col bg-background" data-testid="file-encryption">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">File Encryption</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : data && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card/50 rounded border border-border/30 p-2 text-center">
              <Shield className="w-3 h-3 mx-auto text-green-400 mb-0.5" />
              <div className="text-xs font-bold">{data.encryptedFiles}</div>
              <div className="text-[9px] text-muted-foreground">Encrypted Files</div>
            </div>
            <div className="bg-card/50 rounded border border-border/30 p-2 text-center">
              <FileText className="w-3 h-3 mx-auto text-muted-foreground mb-0.5" />
              <div className="text-xs font-bold">{data.totalFiles}</div>
              <div className="text-[9px] text-muted-foreground">Total Files</div>
            </div>
            <div className="bg-card/50 rounded border border-border/30 p-2 text-center">
              <Key className="w-3 h-3 mx-auto text-primary mb-0.5" />
              <div className="text-xs font-bold">{data.keys.filter((k: any) => k.status === "active").length}</div>
              <div className="text-[9px] text-muted-foreground">Active Keys</div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Encryption Keys</div>
            {data.keys.map((key: any) => (
              <div key={key.id} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 p-2">
                <Key className={`w-3 h-3 shrink-0 ${key.status === "active" ? "text-green-400" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="text-[10px] font-medium">{key.name}</div>
                  <div className="text-[9px] text-muted-foreground">{key.algorithm} · {key.filesEncrypted} files</div>
                </div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase ${key.status === "active" ? "bg-green-400/10 text-green-400" : key.status === "rotated" ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"}`}>{key.status}</span>
                {key.status === "active" && (
                  <button onClick={() => rotateKey(key.id)} className="p-1 hover:bg-muted rounded" title="Rotate key"><RefreshCw className="w-2.5 h-2.5 text-muted-foreground" /></button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Encrypted Files</div>
            {data.encryptedFileList.map((file: any) => (
              <div key={file.path} className="flex items-center gap-2 bg-card/50 rounded border border-border/30 p-2">
                <Lock className="w-3 h-3 text-green-400 shrink-0" />
                <span className="text-[10px] font-mono flex-1 truncate">{file.path}</span>
                <span className="text-[9px] text-muted-foreground">{formatSize(file.originalSize)}</span>
                <button onClick={() => toggleEncrypt(file.path, true)} disabled={encrypting === file.path} className="p-1 hover:bg-muted rounded" title="Decrypt">
                  {encrypting === file.path ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Unlock className="w-2.5 h-2.5 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded p-2 flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-[10px] text-muted-foreground">
              Files are encrypted at rest using AES-256-GCM. Rotate keys periodically for security. Encrypted files show a lock icon in the file tree.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
