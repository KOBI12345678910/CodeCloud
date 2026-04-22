export interface WizardStep {
  id: string;
  title: string;
  description: string;
  type: "select" | "input" | "toggle" | "multi-select";
  options?: { value: string; label: string; description?: string }[];
  default: any;
  required: boolean;
}

export interface WizardConfig {
  templateId: string;
  steps: WizardStep[];
}

export interface WizardResult {
  templateId: string;
  answers: Record<string, any>;
  generatedFiles: { path: string; content: string }[];
}

class TemplateWizardService {
  private wizards: Map<string, WizardConfig> = new Map();

  constructor() {
    this.wizards.set("react-app", {
      templateId: "react-app",
      steps: [
        { id: "styling", title: "Styling Solution", description: "Choose your CSS approach", type: "select", options: [{ value: "tailwind", label: "Tailwind CSS" }, { value: "css-modules", label: "CSS Modules" }, { value: "styled-components", label: "Styled Components" }], default: "tailwind", required: true },
        { id: "routing", title: "Routing", description: "Add client-side routing?", type: "toggle", default: true, required: false },
        { id: "testing", title: "Testing Framework", description: "Choose testing setup", type: "select", options: [{ value: "vitest", label: "Vitest" }, { value: "jest", label: "Jest" }, { value: "none", label: "None" }], default: "vitest", required: false },
        { id: "projectName", title: "Project Name", description: "Name your project", type: "input", default: "my-app", required: true },
      ],
    });
  }

  getWizard(templateId: string): WizardConfig | null { return this.wizards.get(templateId) || null; }
  listWizards(): string[] { return Array.from(this.wizards.keys()); }

  createWizard(templateId: string, steps: WizardStep[]): WizardConfig {
    const config: WizardConfig = { templateId, steps };
    this.wizards.set(templateId, config);
    return config;
  }

  execute(templateId: string, answers: Record<string, any>): WizardResult {
    const files: { path: string; content: string }[] = [
      { path: "package.json", content: JSON.stringify({ name: answers.projectName || "my-app", version: "1.0.0" }, null, 2) },
      { path: "tsconfig.json", content: JSON.stringify({ compilerOptions: { target: "ES2020", jsx: "react-jsx" } }, null, 2) },
    ];
    return { templateId, answers, generatedFiles: files };
  }
}

export const templateWizardService = new TemplateWizardService();
