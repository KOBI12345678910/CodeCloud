import { useState } from "react";
import { X, Copy, ExternalLink, Code2, QrCode, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareEmbedProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export default function ShareEmbed({ projectId, projectName, onClose }: ShareEmbedProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"link" | "embed" | "social">("link");

  const baseUrl = window.location.origin;
  const projectUrl = `${baseUrl}/project/${projectId}`;
  const embedUrl = `${baseUrl}/embed/${projectId}`;
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="500" frameborder="0" allow="clipboard-write" sandbox="allow-scripts allow-same-origin"></iframe>`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-card border border-border/50 rounded-xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="share-embed-modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Share &amp; Embed</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex border-b border-border/30">
          {(["link", "embed", "social"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "link" ? "Public Link" : tab === "embed" ? "Embed Code" : "Social Share"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "link" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Project Link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={projectUrl}
                    className="flex-1 bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-xs font-mono outline-none"
                  />
                  <Button size="sm" onClick={() => copy(projectUrl, "Link")}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                <QrCode className="w-16 h-16 text-muted-foreground/30" />
                <div>
                  <p className="text-xs font-medium">QR Code</p>
                  <p className="text-[10px] text-muted-foreground">Scan to open project on mobile</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "embed" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Embed Code</label>
                <div className="relative">
                  <pre className="bg-muted/30 border border-border/50 rounded-lg p-3 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                    {embedCode}
                  </pre>
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copy(embedCode, "Embed code")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Preview</label>
                <div className="border border-border/50 rounded-lg overflow-hidden bg-[#0d1117] h-40 flex items-center justify-center">
                  <div className="text-center">
                    <Code2 className="w-8 h-8 text-primary/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{projectName}</p>
                    <p className="text-[10px] text-muted-foreground/60">Embedded preview</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-4">Share your project on social media</p>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my project "${projectName}" on CodeCloud!`)}&url=${encodeURIComponent(projectUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-border/50 transition-colors"
              >
                <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                <div>
                  <p className="text-sm font-medium">Twitter / X</p>
                  <p className="text-[10px] text-muted-foreground">Share with your followers</p>
                </div>
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(projectUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-border/50 transition-colors"
              >
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                <div>
                  <p className="text-sm font-medium">LinkedIn</p>
                  <p className="text-[10px] text-muted-foreground">Share with your network</p>
                </div>
              </a>
              <a
                href={`https://www.reddit.com/submit?url=${encodeURIComponent(projectUrl)}&title=${encodeURIComponent(`${projectName} - Built on CodeCloud`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-border/50 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-[#FF4500] flex items-center justify-center text-white text-[10px] font-bold">R</div>
                <div>
                  <p className="text-sm font-medium">Reddit</p>
                  <p className="text-[10px] text-muted-foreground">Share on relevant subreddits</p>
                </div>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
