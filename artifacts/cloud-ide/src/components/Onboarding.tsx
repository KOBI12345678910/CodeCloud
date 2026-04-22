import { useState } from "react";
import { useLocation } from "wouter";
import {
  Code2, GraduationCap, Heart, Briefcase, Users, ArrowRight,
  ArrowLeft, Check, Sparkles, FileCode, Globe, Terminal,
  Zap, FolderOpen, Lightbulb, MousePointer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";

const ROLES = [
  { id: "student", label: "Student", desc: "Learning to code and building projects", icon: GraduationCap },
  { id: "hobbyist", label: "Hobbyist", desc: "Building side projects for fun", icon: Heart },
  { id: "professional", label: "Professional", desc: "Building production applications", icon: Briefcase },
  { id: "team", label: "Team Lead", desc: "Managing a team of developers", icon: Users },
];

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { id: "typescript", label: "TypeScript", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "python", label: "Python", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { id: "html", label: "HTML/CSS", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "go", label: "Go", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  { id: "rust", label: "Rust", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { id: "java", label: "Java", color: "bg-red-600/20 text-red-300 border-red-600/30" },
  { id: "ruby", label: "Ruby", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { id: "cpp", label: "C/C++", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "php", label: "PHP", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
];

const TEMPLATES = [
  { id: "react", label: "React App", desc: "React + Vite starter", icon: Globe, lang: "javascript" },
  { id: "node-api", label: "Node.js API", desc: "Express REST API", icon: Terminal, lang: "javascript" },
  { id: "python-script", label: "Python Script", desc: "Python starter project", icon: FileCode, lang: "python" },
  { id: "static-site", label: "Static Website", desc: "HTML/CSS/JS site", icon: Globe, lang: "html" },
  { id: "blank", label: "Blank Project", desc: "Start from scratch", icon: FolderOpen, lang: "" },
];

const TOUR_TIPS = [
  { icon: FileCode, title: "File Explorer", desc: "Browse, create, and manage your project files in the sidebar." },
  { icon: Code2, title: "Code Editor", desc: "Write code with IntelliSense, syntax highlighting, and multi-cursor support." },
  { icon: Terminal, title: "Terminal", desc: "Run commands, install packages, and debug directly in the integrated terminal." },
  { icon: Zap, title: "Live Preview", desc: "See your changes instantly with hot-reloading preview." },
];

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

export default function Onboarding({ open, onComplete }: OnboardingProps) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const toggleLang = (id: string) => {
    setSelectedLangs((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const canNext = () => {
    if (step === 1) return !!selectedRole;
    if (step === 2) return selectedLangs.length > 0;
    if (step === 3) return !!selectedTemplate;
    return true;
  };

  const handleFinish = () => {
    onComplete();
    if (selectedTemplate && selectedTemplate !== "blank") {
      navigate("/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  const totalSteps = 4;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden [&>button]:hidden" data-testid="onboarding-dialog">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">CodeCloud</span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 <= step ? "bg-primary w-8" : "bg-muted w-4"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 min-h-[400px] flex flex-col">
          {step === 1 && (
            <div className="flex-1" data-testid="onboarding-step-1">
              <h2 className="text-xl font-bold mb-1">Welcome to CodeCloud!</h2>
              <p className="text-sm text-muted-foreground mb-6">What best describes you?</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedRole === role.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                    }`}
                    data-testid={`role-${role.id}`}
                  >
                    <role.icon className={`w-6 h-6 mb-2 ${selectedRole === role.id ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium text-sm">{role.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1" data-testid="onboarding-step-2">
              <h2 className="text-xl font-bold mb-1">Pick your languages</h2>
              <p className="text-sm text-muted-foreground mb-6">Select the languages you work with (pick as many as you like)</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => toggleLang(lang.id)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      selectedLangs.includes(lang.id)
                        ? `${lang.color} border-current`
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    }`}
                    data-testid={`lang-${lang.id}`}
                  >
                    {selectedLangs.includes(lang.id) && <Check className="w-3 h-3 inline mr-1.5" />}
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1" data-testid="onboarding-step-3">
              <h2 className="text-xl font-bold mb-1">Create your first project</h2>
              <p className="text-sm text-muted-foreground mb-6">Choose a template to get started quickly</p>
              <div className="space-y-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      selectedTemplate === t.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                    }`}
                    data-testid={`template-${t.id}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedTemplate === t.id ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
                    }`}>
                      <t.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                    {selectedTemplate === t.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex-1" data-testid="onboarding-step-4">
              <h2 className="text-xl font-bold mb-1">Quick tour</h2>
              <p className="text-sm text-muted-foreground mb-6">Here's a quick overview of the IDE features</p>
              <div className="grid grid-cols-2 gap-3">
                {TOUR_TIPS.map((tip) => (
                  <Card key={tip.title} className="bg-card border-border/50">
                    <CardContent className="p-4">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                        <tip.icon className="w-5 h-5 text-primary" />
                      </div>
                      <p className="font-medium text-sm mb-1">{tip.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Pro tip</p>
                  <p className="text-xs text-muted-foreground">Use <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono">Ctrl+`</kbd> to toggle the terminal and <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-mono">Ctrl+S</kbd> to save your files.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
            <div>
              {step > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground" data-testid="button-skip">
                Skip
              </Button>
              {step < totalSteps ? (
                <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext()} data-testid="button-next">
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleFinish} data-testid="button-finish">
                  <Sparkles className="w-4 h-4 mr-1" /> Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
