import { useState } from "react";
import { ArrowRightLeft, AlertTriangle, X, Loader2, Check, Clock, XCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Transfer {
  id: string;
  projectId: string;
  toEmail: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  message: string | null;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
  fromUsername: string;
}

interface TransferOwnershipProps {
  projectId: string;
  projectName: string;
  isOwner: boolean;
  onTransferComplete?: () => void;
}

export default function TransferOwnership({
  projectId,
  projectName,
  isOwner,
  onTransferComplete,
}: TransferOwnershipProps) {
  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [useEmail, setUseEmail] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();

  const fetchTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/transfer`, {
        credentials: "include",
      });
      if (res.ok) {
        setTransfers(await res.json());
      }
    } catch {
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleInitiateTransfer = async () => {
    if (!recipient.trim()) {
      toast({ title: "Error", description: "Please enter a username or email", variant: "destructive" });
      return;
    }

    if (confirmText !== projectName) {
      toast({ title: "Error", description: "Project name doesn't match", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = {};
      if (useEmail) {
        body.toEmail = recipient.trim();
      } else {
        body.toUsername = recipient.trim();
      }
      if (message.trim()) {
        body.message = message.trim();
      }

      const res = await fetch(`${API_URL}/api/projects/${projectId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({ title: "Transfer Failed", description: data.error, variant: "destructive" });
        return;
      }

      toast({ title: "Transfer Initiated", description: "An email has been sent to the recipient" });
      setShowForm(false);
      setShowConfirm(false);
      setRecipient("");
      setMessage("");
      setConfirmText("");
      fetchTransfers();
    } catch {
      toast({ title: "Error", description: "Failed to initiate transfer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTransfer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/transfer/cancel`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        toast({ title: "Transfer Cancelled" });
        fetchTransfers();
        onTransferComplete?.();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to cancel transfer", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const pendingTransfer = transfers.find((t) => t.status === "pending");

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "accepted":
        return <Check className="w-4 h-4 text-green-400" />;
      case "declined":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "cancelled":
        return <Ban className="w-4 h-4 text-gray-400" />;
      case "expired":
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  if (!isOwner) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Ownership
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Transfer this project to another user or organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTransfers} disabled={loadingTransfers}>
            {loadingTransfers ? <Loader2 className="w-3 h-3 animate-spin" /> : "View History"}
          </Button>
          {!pendingTransfer && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowForm(true)}
              disabled={showForm}
            >
              Transfer
            </Button>
          )}
        </div>
      </div>

      {pendingTransfer && (
        <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Transfer Pending</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Waiting for <strong>{pendingTransfer.toEmail}</strong> to accept.
                Expires {new Date(pendingTransfer.expiresAt).toLocaleDateString()}.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelTransfer}
              disabled={loading}
              className="text-red-400 border-red-400/30 hover:bg-red-400/10"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancel Transfer"}
            </Button>
          </div>
        </div>
      )}

      {showForm && !pendingTransfer && (
        <div className="p-4 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">New Transfer</h4>
            <button onClick={() => { setShowForm(false); setShowConfirm(false); }}>
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 text-xs rounded-full ${!useEmail ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              onClick={() => setUseEmail(false)}
            >
              Username
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-full ${useEmail ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              onClick={() => setUseEmail(true)}
            >
              Email
            </button>
          </div>

          <Input
            placeholder={useEmail ? "recipient@example.com" : "username"}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />

          <Input
            placeholder="Optional message to the recipient"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {!showConfirm ? (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!recipient.trim()}
              className="w-full"
              variant="destructive"
            >
              Continue
            </Button>
          ) : (
            <div className="space-y-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-destructive mb-1">This action is irreversible</p>
                  <p className="text-muted-foreground">
                    Transferring ownership will make <strong>{recipient}</strong> the new owner.
                    You'll be added as an admin collaborator. All existing collaborators keep their access.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Type <strong>{projectName}</strong> to confirm
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={projectName}
                  className="font-mono text-sm"
                />
              </div>

              <Button
                onClick={handleInitiateTransfer}
                disabled={loading || confirmText !== projectName}
                className="w-full"
                variant="destructive"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                )}
                Transfer Ownership
              </Button>
            </div>
          )}
        </div>
      )}

      {transfers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Transfer History</h4>
          {transfers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 text-sm"
            >
              <div className="flex items-center gap-2">
                {statusIcon(t.status)}
                <span className="text-foreground">{t.toEmail}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="capitalize">{t.status}</span>
                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
