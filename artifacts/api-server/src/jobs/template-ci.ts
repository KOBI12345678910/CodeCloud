export interface TemplateCIResult {
  templateId: string;
  templateName: string;
  status: "passed" | "failed" | "skipped";
  steps: CIStep[];
  duration: number;
  runAt: string;
}

export interface CIStep {
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  output?: string;
}

export function runTemplateCITests(): TemplateCIResult[] {
  const templates = [
    { id: "react-vite", name: "React + Vite" },
    { id: "express-api", name: "Express API" },
    { id: "nextjs", name: "Next.js" },
    { id: "python-flask", name: "Python Flask" },
    { id: "go-fiber", name: "Go Fiber" },
  ];

  return templates.map(t => {
    const steps: CIStep[] = [
      { name: "Create project", status: "passed", duration: Math.floor(Math.random() * 5) + 1 },
      { name: "Install dependencies", status: Math.random() > 0.1 ? "passed" : "failed", duration: Math.floor(Math.random() * 30) + 5 },
      { name: "Build project", status: Math.random() > 0.1 ? "passed" : "failed", duration: Math.floor(Math.random() * 20) + 3 },
      { name: "Run tests", status: Math.random() > 0.15 ? "passed" : "failed", duration: Math.floor(Math.random() * 15) + 2 },
      { name: "Verify output", status: Math.random() > 0.05 ? "passed" : "failed", duration: Math.floor(Math.random() * 5) + 1 },
    ];

    const firstFailed = steps.findIndex(s => s.status === "failed");
    if (firstFailed >= 0) for (let i = firstFailed + 1; i < steps.length; i++) steps[i].status = "skipped";

    return {
      templateId: t.id, templateName: t.name,
      status: steps.every(s => s.status === "passed") ? "passed" : "failed",
      steps, duration: steps.reduce((s, st) => s + st.duration, 0),
      runAt: new Date().toISOString(),
    };
  });
}
