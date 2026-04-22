import { useState } from "react";
import { X, Wand2, Check, ArrowRight, ArrowLeft, Loader2, Database, Shield, Palette, TestTube2, GitBranch, Package } from "lucide-react";

interface Props { templateId: string; templateName: string; onClose: () => void; onGenerate: (config: CustomConfig) => void; }

interface CustomConfig {
  templateId: string;
  auth: string | null;
  database: string | null;
  styling: string;
  testing: string | null;
  cicd: string | null;
  features: string[];
}

const STEPS = ["Authentication", "Database", "Styling", "Testing", "CI/CD", "Features", "Review"] as const;

export function TemplateCustomizer({ templateId, templateName, onClose, onGenerate }: Props) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<CustomConfig>({
    templateId,
    auth: null,
    database: null,
    styling: "tailwind",
    testing: null,
    cicd: null,
    features: [],
  });
  const [generating, setGenerating] = useState(false);

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const generate = () => {
    setGenerating(true);
    setTimeout(() => { onGenerate(config); setGenerating(false); }, 1500);
  };

  const toggleFeature = (f: string) => {
    setConfig(prev => ({ ...prev, features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f] }));
  };

  const Option = ({ value, label, desc, selected, onClick, icon: Icon }: { value: string; label: string; desc: string; selected: boolean; onClick: () => void; icon?: any }) => (
    <button onClick={onClick} className={`text-left rounded-lg p-3 border transition-colors ${selected ? "border-primary bg-primary/10" : "border-border/30 bg-card/50 hover:border-primary/30"}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />}
        <span className="text-xs font-medium">{label}</span>
        {selected && <Check className="w-3 h-3 text-primary ml-auto" />}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{desc}</div>
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-background" data-testid="template-customizer">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-2"><Wand2 className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium">Customize: {templateName}</span></div>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30 overflow-x-auto shrink-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button onClick={() => setStep(i)} className={`px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}. {s}</button>
            {i < STEPS.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {step === 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium mb-2">Add Authentication?</div>
            <div className="grid grid-cols-2 gap-2">
              <Option value="none" label="None" desc="No authentication" selected={config.auth === null} onClick={() => setConfig({ ...config, auth: null })} />
              <Option value="clerk" label="Clerk" desc="Full-featured auth with social login" selected={config.auth === "clerk"} onClick={() => setConfig({ ...config, auth: "clerk" })} icon={Shield} />
              <Option value="nextauth" label="NextAuth" desc="Flexible auth for Next.js" selected={config.auth === "nextauth"} onClick={() => setConfig({ ...config, auth: "nextauth" })} icon={Shield} />
              <Option value="passport" label="Passport.js" desc="Classic Node.js auth middleware" selected={config.auth === "passport"} onClick={() => setConfig({ ...config, auth: "passport" })} icon={Shield} />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-2">
            <div className="text-xs font-medium mb-2">Add Database?</div>
            <div className="grid grid-cols-2 gap-2">
              <Option value="none" label="None" desc="No database" selected={config.database === null} onClick={() => setConfig({ ...config, database: null })} />
              <Option value="postgres" label="PostgreSQL" desc="With Drizzle ORM" selected={config.database === "postgres"} onClick={() => setConfig({ ...config, database: "postgres" })} icon={Database} />
              <Option value="sqlite" label="SQLite" desc="Lightweight file-based" selected={config.database === "sqlite"} onClick={() => setConfig({ ...config, database: "sqlite" })} icon={Database} />
              <Option value="mongodb" label="MongoDB" desc="Document database with Mongoose" selected={config.database === "mongodb"} onClick={() => setConfig({ ...config, database: "mongodb" })} icon={Database} />
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-2">
            <div className="text-xs font-medium mb-2">Styling Framework</div>
            <div className="grid grid-cols-2 gap-2">
              <Option value="tailwind" label="Tailwind CSS" desc="Utility-first CSS framework" selected={config.styling === "tailwind"} onClick={() => setConfig({ ...config, styling: "tailwind" })} icon={Palette} />
              <Option value="css-modules" label="CSS Modules" desc="Scoped CSS with modules" selected={config.styling === "css-modules"} onClick={() => setConfig({ ...config, styling: "css-modules" })} icon={Palette} />
              <Option value="styled" label="Styled Components" desc="CSS-in-JS solution" selected={config.styling === "styled"} onClick={() => setConfig({ ...config, styling: "styled" })} icon={Palette} />
              <Option value="vanilla" label="Vanilla CSS" desc="Plain CSS, no framework" selected={config.styling === "vanilla"} onClick={() => setConfig({ ...config, styling: "vanilla" })} icon={Palette} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-2">
            <div className="text-xs font-medium mb-2">Add Testing?</div>
            <div className="grid grid-cols-2 gap-2">
              <Option value="none" label="None" desc="No testing framework" selected={config.testing === null} onClick={() => setConfig({ ...config, testing: null })} />
              <Option value="vitest" label="Vitest" desc="Fast Vite-native testing" selected={config.testing === "vitest"} onClick={() => setConfig({ ...config, testing: "vitest" })} icon={TestTube2} />
              <Option value="jest" label="Jest" desc="Popular testing framework" selected={config.testing === "jest"} onClick={() => setConfig({ ...config, testing: "jest" })} icon={TestTube2} />
              <Option value="playwright" label="Playwright" desc="E2E browser testing" selected={config.testing === "playwright"} onClick={() => setConfig({ ...config, testing: "playwright" })} icon={TestTube2} />
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-2">
            <div className="text-xs font-medium mb-2">Add CI/CD?</div>
            <div className="grid grid-cols-2 gap-2">
              <Option value="none" label="None" desc="No CI/CD pipeline" selected={config.cicd === null} onClick={() => setConfig({ ...config, cicd: null })} />
              <Option value="github-actions" label="GitHub Actions" desc="Automated workflows" selected={config.cicd === "github-actions"} onClick={() => setConfig({ ...config, cicd: "github-actions" })} icon={GitBranch} />
              <Option value="gitlab-ci" label="GitLab CI" desc="GitLab CI/CD pipelines" selected={config.cicd === "gitlab-ci"} onClick={() => setConfig({ ...config, cicd: "gitlab-ci" })} icon={GitBranch} />
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="space-y-2">
            <div className="text-xs font-medium mb-2">Additional Features</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "docker", label: "Docker", desc: "Dockerfile & docker-compose" },
                { id: "eslint", label: "ESLint", desc: "Code linting" },
                { id: "prettier", label: "Prettier", desc: "Code formatting" },
                { id: "husky", label: "Git Hooks", desc: "Pre-commit hooks with Husky" },
                { id: "env", label: "Env Management", desc: ".env files with validation" },
                { id: "swagger", label: "API Docs", desc: "Swagger/OpenAPI documentation" },
                { id: "websocket", label: "WebSockets", desc: "Real-time communication" },
                { id: "i18n", label: "i18n", desc: "Internationalization support" },
              ].map(f => (
                <button key={f.id} onClick={() => toggleFeature(f.id)} className={`text-left rounded-lg p-2 border transition-colors ${config.features.includes(f.id) ? "border-primary bg-primary/10" : "border-border/30 bg-card/50 hover:border-primary/30"}`}>
                  <div className="flex items-center gap-1.5"><Package className={`w-3 h-3 ${config.features.includes(f.id) ? "text-primary" : "text-muted-foreground"}`} /><span className="text-xs font-medium">{f.label}</span>{config.features.includes(f.id) && <Check className="w-3 h-3 text-primary ml-auto" />}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 6 && (
          <div className="space-y-3">
            <div className="text-xs font-medium mb-2">Configuration Summary</div>
            <div className="bg-card/50 rounded-lg p-3 border border-border/30 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span className="font-medium">{templateName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Authentication</span><span className="font-medium">{config.auth || "None"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Database</span><span className="font-medium">{config.database || "None"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Styling</span><span className="font-medium">{config.styling}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Testing</span><span className="font-medium">{config.testing || "None"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CI/CD</span><span className="font-medium">{config.cicd || "None"}</span></div>
              {config.features.length > 0 && (
                <div><span className="text-muted-foreground">Features: </span><span className="font-medium">{config.features.join(", ")}</span></div>
              )}
            </div>
            <button onClick={generate} disabled={generating} className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Generate Customized Project
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/30 shrink-0">
        <button onClick={prev} disabled={step === 0} className="flex items-center gap-1 px-3 py-1 text-xs border border-border rounded hover:bg-muted disabled:opacity-30"><ArrowLeft className="w-3 h-3" /> Back</button>
        {step < STEPS.length - 1 && <button onClick={next} className="flex items-center gap-1 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Next <ArrowRight className="w-3 h-3" /></button>}
      </div>
    </div>
  );
}
