export interface TypeDoc {
  name: string;
  kind: "interface" | "type" | "enum" | "class" | "function";
  description: string;
  properties: { name: string; type: string; optional: boolean; description: string }[];
  source: { file: string; line: number };
}

class TypeDocsService {
  extractTypes(content: string, file: string): TypeDoc[] {
    const docs: TypeDoc[] = [];
    const interfaceRe = /export\s+interface\s+(\w+)\s*\{([^}]*)\}/g;
    let m;
    while ((m = interfaceRe.exec(content))) {
      const props = m[2].split(";").filter(Boolean).map(p => {
        const pm = p.trim().match(/(\w+)(\?)?:\s*(.+)/);
        return pm ? { name: pm[1], type: pm[3].trim(), optional: !!pm[2], description: "" } : null;
      }).filter(Boolean) as TypeDoc["properties"];
      docs.push({ name: m[1], kind: "interface", description: `Interface ${m[1]}`, properties: props, source: { file, line: content.slice(0, m.index).split("\n").length } });
    }
    const typeRe = /export\s+type\s+(\w+)\s*=\s*([^;]+)/g;
    while ((m = typeRe.exec(content))) {
      docs.push({ name: m[1], kind: "type", description: `Type alias ${m[1]}`, properties: [], source: { file, line: content.slice(0, m.index).split("\n").length } });
    }
    return docs;
  }

  generateMarkdown(docs: TypeDoc[]): string {
    return docs.map(d => {
      let md = `## ${d.kind} ${d.name}\n\n${d.description}\n\n`;
      if (d.properties.length) {
        md += "| Property | Type | Required |\n|----------|------|----------|\n";
        md += d.properties.map(p => `| ${p.name} | \`${p.type}\` | ${p.optional ? "No" : "Yes"} |`).join("\n");
      }
      return md;
    }).join("\n\n---\n\n");
  }
}

export const typeDocsService = new TypeDocsService();
