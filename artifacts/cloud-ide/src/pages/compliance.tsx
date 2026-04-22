import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Shield, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Download, FileText } from "lucide-react";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

export default function CompliancePage() {
  const [framework, setFramework] = useState<"SOC2" | "GDPR" | "HIPAA">("SOC2");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const projectId = "default";

  const generate = async () => {
    setLoading(true);
    try { const res = await fetch(`${API}/projects/${projectId}/compliance/${framework}`, { credentials: "include" }); if (res.ok) setReport(await res.json()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { generate(); }, [framework]);

  const statusIcon = (s: string) => s === "pass" ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : s === "fail" ? <XCircle className="w-3 h-3 text-red-400" /> : <AlertTriangle className="w-3 h-3 text-yellow-400" />;
  const statusColor = (s: string) => s === "compliant" ? "text-green-400" : s === "non_compliant" ? "text-red-400" : "text-yellow-400";

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="compliance-page">
      <header className="border-b border-border/50 bg-card/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /><h1 className="text-sm font-semibold">Compliance Reports</h1></div>
          </div>
          <div className="flex items-center gap-2">
            {(["SOC2", "GDPR", "HIPAA"] as const).map(f => (
              <button key={f} onClick={() => setFramework(f)} className={`px-3 py-1 text-xs rounded ${framework === f ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>{f}</button>
            ))}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div> : report && (
          <>
            <div className="flex items-center gap-4 bg-card/50 rounded-lg border border-border/30 p-4">
              <div className="text-center"><div className="text-3xl font-bold">{report.overallScore}%</div><div className={`text-xs capitalize ${statusColor(report.status)}`}>{report.status.replace("_", " ")}</div></div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${report.overallScore >= 90 ? "bg-green-400" : report.overallScore >= 70 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${report.overallScore}%` }} /></div>
            </div>
            {report.sections.map((section: any) => (
              <div key={section.id} className="bg-card/50 rounded-lg border border-border/30 p-4 space-y-2">
                <div className="flex items-center gap-2">{statusIcon(section.status)}<h3 className="text-sm font-medium">{section.name}</h3></div>
                <div className="space-y-1">
                  {section.checks.map((check: any) => (
                    <div key={check.id} className="flex items-start gap-2 text-xs pl-2">
                      {statusIcon(check.status)}
                      <div className="flex-1"><span>{check.name}</span><span className="text-muted-foreground ml-2">— {check.detail}</span></div>
                      {check.remediation && <span className="text-[10px] text-primary">{check.remediation}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
