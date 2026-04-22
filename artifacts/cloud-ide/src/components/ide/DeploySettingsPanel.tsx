import { useState, useEffect } from "react";
import { Settings, X, Save, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || "";

interface DeploySettingsPanelProps {
  projectId: string;
  testCommand: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function DeploySettingsPanel({ projectId, testCommand: initialTestCommand, onClose, onSaved }: DeploySettingsPanelProps) {
  const [testCommand, setTestCommand] = useState(initialTestCommand || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setTestCommand(initialTestCommand || "");
  }, [initialTestCommand]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ testCommand: testCommand || null }),
      });
      if (res.ok) {
        toast({ title: "Deploy settings saved" });
        onSaved();
      } else {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error saving settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          <span className="text-gray-300 font-medium">Deploy Settings</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-300 p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
            <label className="text-xs text-gray-300 font-medium">Test Command</label>
          </div>
          <Input
            value={testCommand}
            onChange={(e) => setTestCommand(e.target.value)}
            placeholder="e.g., npm test, pytest, go test ./..."
            className="h-8 text-xs bg-[#2a2a2a] border-[#444] text-gray-300 placeholder:text-gray-600"
            data-testid="input-test-command"
          />
          <p className="text-[10px] text-gray-500">
            When configured, this command runs before each deployment. If it fails, the deployment is blocked.
            Leave empty to skip pre-deploy testing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save-deploy-settings"
          >
            <Save className="w-3 h-3" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {testCommand && (
            <span className="text-[10px] text-green-400/70 bg-green-400/10 px-2 py-0.5 rounded">
              Tests will run on deploy
            </span>
          )}
          {!testCommand && (
            <span className="text-[10px] text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded">
              Tests skipped on deploy
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
