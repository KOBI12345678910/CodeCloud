import { useState, useEffect, useCallback } from "react";
import {
  Settings, Save, RotateCcw, Terminal, FolderOpen,
  ChevronDown, Check, Loader2, FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface EnvironmentConfig {
  nodeVersion: string;
  pythonVersion: string;
  goVersion: string;
  workingDirectory: string;
  buildCommand: string;
  startCommand: string;
  installCommand: string;
}

interface SupportedVersions {
  node: string[];
  python: string[];
  go: string[];
}

interface ProjectConfigProps {
  projectId: string;
  language?: string;
  onConfigChange?: (config: EnvironmentConfig) => void;
}

export default function ProjectConfig({ projectId, language = "javascript", onConfigChange }: ProjectConfigProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<EnvironmentConfig>({
    nodeVersion: "20",
    pythonVersion: "3.11",
    goVersion: "1.21",
    workingDirectory: "/app",
    buildCommand: "",
    startCommand: "",
    installCommand: "",
  });
  const [versions, setVersions] = useState<SupportedVersions>({ node: [], python: [], go: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [generatedDockerfile, setGeneratedDockerfile] = useState("");
  const [showDockerfile, setShowDockerfile] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [versionsRes, defaultsRes] = await Promise.all([
          fetch(`${API_BASE}/api/environment/versions`),
          fetch(`${API_BASE}/api/environment/defaults/${language}`),
        ]);
        if (versionsRes.ok) setVersions(await versionsRes.json());
        if (defaultsRes.ok) {
          const defaults = await defaultsRes.json();
          setConfig(defaults);
        }
      } catch {
        toast({ title: "Failed to load environment config", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [language, toast]);

  const updateField = useCallback(<K extends keyof EnvironmentConfig>(
    field: K, value: EnvironmentConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    setValidationErrors([]);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const validateRes = await fetch(`${API_BASE}/api/environment/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      const validateData = await validateRes.json();
      if (!validateData.valid) {
        setValidationErrors(validateData.errors);
        toast({ title: "Invalid configuration", description: validateData.errors[0], variant: "destructive" });
        return;
      }
      onConfigChange?.(config);
      setDirty(false);
      toast({ title: "Configuration saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [config, toast, onConfigChange]);

  const handleReset = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/environment/defaults/${language}`);
      if (res.ok) {
        const defaults = await res.json();
        setConfig(defaults);
        setDirty(true);
        setValidationErrors([]);
        toast({ title: "Reset to defaults" });
      }
    } catch {
      toast({ title: "Failed to reset", variant: "destructive" });
    }
  }, [language, toast]);

  const handleGenerateDockerfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/environment/dockerfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language, config }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedDockerfile(data.dockerfile);
        setShowDockerfile(true);
      }
    } catch {
      toast({ title: "Failed to generate Dockerfile", variant: "destructive" });
    }
  }, [language, config, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Environment Configuration
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure runtime versions and build commands for your project
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3">
          {validationErrors.map((err, i) => (
            <p key={i} className="text-sm text-red-400">{err}</p>
          ))}
        </div>
      )}

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Runtime Versions</CardTitle>
          <CardDescription className="text-xs">Select the runtime versions for your project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Node.js Version</Label>
              <Select value={config.nodeVersion} onValueChange={(v) => updateField("nodeVersion", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.node.map((v) => (
                    <SelectItem key={v} value={v}>Node.js {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Python Version</Label>
              <Select value={config.pythonVersion} onValueChange={(v) => updateField("pythonVersion", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.python.map((v) => (
                    <SelectItem key={v} value={v}>Python {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Go Version</Label>
              <Select value={config.goVersion} onValueChange={(v) => updateField("goVersion", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.go.map((v) => (
                    <SelectItem key={v} value={v}>Go {v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Project Settings</CardTitle>
          <CardDescription className="text-xs">Configure working directory and commands</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Working Directory
            </Label>
            <Input
              value={config.workingDirectory}
              onChange={(e) => updateField("workingDirectory", e.target.value)}
              placeholder="/app"
              className="font-mono text-sm h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Install Command
            </Label>
            <Input
              value={config.installCommand}
              onChange={(e) => updateField("installCommand", e.target.value)}
              placeholder="npm install"
              className="font-mono text-sm h-9"
            />
            <p className="text-[10px] text-muted-foreground">Command to install dependencies</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Build Command
            </Label>
            <Input
              value={config.buildCommand}
              onChange={(e) => updateField("buildCommand", e.target.value)}
              placeholder="npm run build"
              className="font-mono text-sm h-9"
            />
            <p className="text-[10px] text-muted-foreground">Command to build the project (optional)</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Start Command
            </Label>
            <Input
              value={config.startCommand}
              onChange={(e) => updateField("startCommand", e.target.value)}
              placeholder="npm start"
              className="font-mono text-sm h-9"
            />
            <p className="text-[10px] text-muted-foreground">Command to start the project</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            Dockerfile Preview
          </CardTitle>
          <CardDescription className="text-xs">
            Generate a Dockerfile based on your configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handleGenerateDockerfile}>
            Generate Dockerfile
          </Button>
          {showDockerfile && generatedDockerfile && (
            <div className="mt-3 relative">
              <pre className="bg-muted/50 rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-border/30">
                {generatedDockerfile}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(generatedDockerfile);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
