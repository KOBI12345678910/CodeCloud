export interface GeneratedComponent {
  id: string;
  description: string;
  name: string;
  code: string;
  props: { name: string; type: string; required: boolean; defaultValue?: string }[];
  story: string;
  cssFramework: "tailwind" | "css-modules";
  createdAt: Date;
}

class AIComponentGenService {
  private components: GeneratedComponent[] = [];

  generate(description: string, name?: string): GeneratedComponent {
    const componentName = name || this.inferName(description);
    const props = this.inferProps(description);

    const propsInterface = props.map(p =>
      `  ${p.name}${p.required ? "" : "?"}: ${p.type};`
    ).join("\n");

    const code = `import React from "react";

interface ${componentName}Props {
${propsInterface}
}

export function ${componentName}({ ${props.map(p => p.name).join(", ")} }: ${componentName}Props) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        ${props.some(p => p.name === "title") ? `<h3 className="text-lg font-semibold text-gray-900">{title}</h3>` : `<h3 className="text-lg font-semibold text-gray-900">${componentName}</h3>`}
      </div>
      ${props.some(p => p.name === "children") ? `<div className="mt-2">{children}</div>` : `<p className="mt-2 text-sm text-gray-600">Generated from: ${description}</p>`}
    </div>
  );
}`;

    const story = `import type { Meta, StoryObj } from "@storybook/react";
import { ${componentName} } from "./${componentName}";

const meta: Meta<typeof ${componentName}> = {
  title: "Components/${componentName}",
  component: ${componentName},
};
export default meta;

type Story = StoryObj<typeof ${componentName}>;

export const Default: Story = {
  args: {
${props.filter(p => p.required).map(p => `    ${p.name}: ${p.type === "string" ? `"Sample ${p.name}"` : p.type === "number" ? "42" : p.type === "boolean" ? "true" : "undefined"},`).join("\n")}
  },
};`;

    const component: GeneratedComponent = {
      id: `comp-${Date.now()}`, description, name: componentName,
      code, props, story, cssFramework: "tailwind", createdAt: new Date(),
    };
    this.components.push(component);
    return component;
  }

  list(): GeneratedComponent[] { return this.components; }

  private inferName(desc: string): string {
    const words = desc.split(/\s+/).slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    return words.join("").replace(/[^a-zA-Z0-9]/g, "");
  }

  private inferProps(desc: string): GeneratedComponent["props"] {
    const props: GeneratedComponent["props"] = [];
    const lower = desc.toLowerCase();
    if (lower.includes("title") || lower.includes("heading")) props.push({ name: "title", type: "string", required: true });
    if (lower.includes("description") || lower.includes("text")) props.push({ name: "description", type: "string", required: false });
    if (lower.includes("button") || lower.includes("click")) props.push({ name: "onClick", type: "() => void", required: false });
    if (lower.includes("image") || lower.includes("avatar")) props.push({ name: "imageUrl", type: "string", required: false });
    if (lower.includes("list") || lower.includes("items")) props.push({ name: "items", type: "string[]", required: true });
    if (lower.includes("loading") || lower.includes("skeleton")) props.push({ name: "isLoading", type: "boolean", required: false, defaultValue: "false" });
    if (props.length === 0) {
      props.push({ name: "title", type: "string", required: true });
      props.push({ name: "children", type: "React.ReactNode", required: false });
    }
    return props;
  }
}

export const aiComponentGenService = new AIComponentGenService();
