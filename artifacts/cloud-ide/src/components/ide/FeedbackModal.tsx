import { useState } from "react";
import { MessageSquare, X, Bug, Lightbulb, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FeedbackModalProps {
  projectId?: string;
  onClose: () => void;
}

const typeOptions = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-400" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-amber-400" },
  { value: "improvement", label: "Improvement", icon: TrendingUp, color: "text-emerald-400" },
] as const;

const severityOptions = ["low", "medium", "high", "critical"] as const;

export default function FeedbackModal({ projectId, onClose }: FeedbackModalProps) {
  const { toast } = useToast();
  const [type, setType] = useState<string>("bug");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (description.length < 10) {
      toast({ title: "Please provide more details (at least 10 characters)", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, description, severity, email: email || undefined, projectId }),
      });

      if (res.ok) {
        toast({ title: "Feedback submitted! Thank you." });
        onClose();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Failed to submit", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-card border border-border/50 rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="feedback-modal"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Send Feedback</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
            <div className="flex gap-2">
              {typeOptions.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    type === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-border"
                  }`}
                >
                  <t.icon className={`w-3.5 h-3.5 ${type === t.value ? "text-primary" : t.color}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your feedback in detail..."
              className="w-full h-28 bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-primary/50"
              data-testid="textarea-feedback"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Severity</label>
            <div className="flex gap-1.5">
              {severityOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`flex-1 py-1.5 rounded text-[11px] font-medium capitalize transition-colors ${
                    severity === s
                      ? s === "critical"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : s === "high"
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : s === "medium"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-muted/30 text-muted-foreground border border-transparent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Email for follow-up (optional)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border/30 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || description.length < 10}>
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}
