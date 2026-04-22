import { useState, useEffect } from "react";
import { useParams, useSearch, Link } from "wouter";
import { ArrowRightLeft, Check, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function TransferPage() {
  const params = useParams<{ transferId: string; action: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (params.action && token) {
      handleAction();
    }
  }, []);

  const handleAction = async () => {
    if (!params.transferId || !params.action || !token) return;

    setStatus("loading");

    try {
      const endpoint = params.action === "accept"
        ? `${API_URL}/api/transfer/${params.transferId}/accept`
        : `${API_URL}/api/transfer/${params.transferId}/decline`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        if (data.projectId) setProjectId(data.projectId);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  const isAccept = params.action === "accept";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary font-bold text-xl">
            <span className="bg-primary/10 px-2 py-1 rounded text-primary">&lt;/&gt;</span>
            CodeCloud
          </Link>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          {status === "idle" && !token && (
            <div className="text-center space-y-4">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
              <h2 className="text-lg font-semibold">Invalid Transfer Link</h2>
              <p className="text-sm text-muted-foreground">
                This transfer link is missing required parameters. Please use the link from the email you received.
              </p>
            </div>
          )}

          {status === "loading" && (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <h2 className="text-lg font-semibold">
                {isAccept ? "Accepting Transfer..." : "Declining Transfer..."}
              </h2>
              <p className="text-sm text-muted-foreground">Please wait while we process your response.</p>
            </div>
          )}

          {status === "success" && isAccept && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-green-400">Transfer Accepted</h2>
              <p className="text-sm text-muted-foreground">
                You are now the owner of this project. The previous owner has been added as an admin collaborator.
              </p>
              {projectId && (
                <Link href={`/project/${projectId}`}>
                  <Button className="mt-4">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Open Project
                  </Button>
                </Link>
              )}
            </div>
          )}

          {status === "success" && !isAccept && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold">Transfer Declined</h2>
              <p className="text-sm text-muted-foreground">
                The transfer has been declined. The project owner has been notified.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-red-400">Transfer Failed</h2>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button variant="outline" onClick={handleAction} className="mt-4">
                Try Again
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
