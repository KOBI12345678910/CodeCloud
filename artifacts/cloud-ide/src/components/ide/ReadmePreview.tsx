import { useState, useMemo, useCallback } from "react";
import {
  Eye, Pencil, Columns2, FileText, Copy, Check,
  Wand2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre class="md-code-block"><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6 class="md-h6">$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5 class="md-h5">$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="md-h1">$1</h1>');

  html = html.replace(/^\*\*\*$|^---$|^___$/gm, '<hr class="md-hr" />');

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener">$1</a>');

  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

  html = html.replace(/^[-*]\s+(.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');

  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-oli">$1</li>');
  html = html.replace(/((?:<li class="md-oli">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');

  const lines = html.split("\n");
  const result: string[] = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inParagraph) { result.push("</p>"); inParagraph = false; }
      continue;
    }
    if (trimmed.startsWith("<h") || trimmed.startsWith("<pre") || trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") || trimmed.startsWith("<hr") || trimmed.startsWith("<blockquote")) {
      if (inParagraph) { result.push("</p>"); inParagraph = false; }
      result.push(trimmed);
    } else {
      if (!inParagraph) { result.push('<p class="md-p">'); inParagraph = true; }
      result.push(trimmed);
    }
  }
  if (inParagraph) result.push("</p>");

  return result.join("\n");
}

function generateTemplate(projectName: string, description: string, language: string): string {
  const langSetup: Record<string, { install: string; run: string }> = {
    typescript: { install: "npm install", run: "npm run dev" },
    javascript: { install: "npm install", run: "npm start" },
    python: { install: "pip install -r requirements.txt", run: "python main.py" },
    go: { install: "go mod download", run: "go run ." },
    rust: { install: "cargo build", run: "cargo run" },
  };
  const setup = langSetup[language] || langSetup.typescript;

  return `# ${projectName}

${description || "A brief description of your project."}

## Features

- Feature 1
- Feature 2
- Feature 3

## Getting Started

### Prerequisites

- ${language === "python" ? "Python 3.8+" : language === "go" ? "Go 1.21+" : language === "rust" ? "Rust 1.70+" : "Node.js 18+"}

### Installation

\`\`\`bash
git clone https://github.com/username/${projectName.toLowerCase().replace(/\s+/g, "-")}.git
cd ${projectName.toLowerCase().replace(/\s+/g, "-")}
${setup.install}
\`\`\`

### Usage

\`\`\`bash
${setup.run}
\`\`\`

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/api/health\` | GET | Health check |

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;
}

const MD_STYLES = `
.md-preview { color: hsl(222, 10%, 85%); line-height: 1.7; }
.md-preview .md-h1 { font-size: 1.75rem; font-weight: 700; margin: 1.5rem 0 0.75rem; padding-bottom: 0.3rem; border-bottom: 1px solid hsl(222, 47%, 20%); }
.md-preview .md-h2 { font-size: 1.4rem; font-weight: 600; margin: 1.25rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid hsl(222, 47%, 20%); }
.md-preview .md-h3 { font-size: 1.15rem; font-weight: 600; margin: 1rem 0 0.5rem; }
.md-preview .md-h4, .md-preview .md-h5, .md-preview .md-h6 { font-size: 1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
.md-preview .md-p { margin: 0.5rem 0; }
.md-preview .md-code-block { background: hsl(222, 47%, 8%); border: 1px solid hsl(222, 47%, 18%); border-radius: 6px; padding: 0.75rem 1rem; overflow-x: auto; margin: 0.75rem 0; font-size: 0.8rem; }
.md-preview .md-code-block code { font-family: 'JetBrains Mono', monospace; }
.md-preview .md-inline-code { background: hsl(222, 47%, 16%); padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.85em; font-family: 'JetBrains Mono', monospace; }
.md-preview .md-link { color: hsl(217, 91%, 60%); text-decoration: underline; }
.md-preview .md-link:hover { color: hsl(217, 91%, 70%); }
.md-preview .md-blockquote { border-left: 3px solid hsl(222, 47%, 30%); padding: 0.25rem 1rem; margin: 0.5rem 0; color: hsl(222, 10%, 60%); }
.md-preview .md-ul, .md-preview .md-ol { padding-left: 1.5rem; margin: 0.5rem 0; }
.md-preview .md-li, .md-preview .md-oli { margin: 0.25rem 0; }
.md-preview .md-hr { border: none; border-top: 1px solid hsl(222, 47%, 20%); margin: 1rem 0; }
.md-preview .md-img { max-width: 100%; border-radius: 6px; margin: 0.5rem 0; }
.md-preview strong { font-weight: 600; }
.md-preview em { font-style: italic; }
.md-preview del { text-decoration: line-through; opacity: 0.6; }
`;

interface ReadmePreviewProps {
  initialContent?: string;
  projectName?: string;
  projectDescription?: string;
  projectLanguage?: string;
  onChange?: (content: string) => void;
}

export default function ReadmePreview({
  initialContent,
  projectName = "My Project",
  projectDescription = "",
  projectLanguage = "typescript",
  onChange,
}: ReadmePreviewProps) {
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent || "");
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split");
  const [copied, setCopied] = useState(false);

  const renderedHtml = useMemo(() => renderMarkdown(content), [content]);

  const handleChange = useCallback((val: string) => {
    setContent(val);
    onChange?.(val);
  }, [onChange]);

  const handleGenerate = (template: string) => {
    const generated = generateTemplate(projectName, projectDescription, template);
    handleChange(generated);
    toast({ title: "README template generated" });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,11%)] text-sm" data-testid="readme-preview">
      <style>{MD_STYLES}</style>

      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[hsl(222,47%,13%)] shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium">README.md</span>
        </div>
        <div className="flex items-center gap-1">
          {(["edit", "split", "preview"] as const).map((mode) => {
            const Icon = mode === "edit" ? Pencil : mode === "preview" ? Eye : Columns2;
            return (
              <Button
                key={mode}
                variant="ghost" size="sm"
                className={`h-6 text-[10px] px-2 capitalize ${viewMode === mode ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                onClick={() => setViewMode(mode)}
                data-testid={`mode-${mode}`}
              >
                <Icon className="w-3 h-3 mr-1" /> {mode}
              </Button>
            );
          })}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 ml-1" data-testid="button-generate">
                <Wand2 className="w-3 h-3 mr-1" /> Generate
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {["typescript", "javascript", "python", "go", "rust"].map((lang) => (
                <DropdownMenuItem key={lang} onClick={() => handleGenerate(lang)}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)} project
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2 border-r border-border/30" : "w-full"} flex flex-col`}>
            <div className="px-3 py-1 bg-[hsl(222,47%,12%)] border-b border-border/20 text-[10px] text-muted-foreground">
              Markdown
            </div>
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              className="flex-1 w-full bg-[hsl(222,47%,9%)] text-foreground font-mono text-xs p-4 resize-none outline-none"
              spellCheck={false}
              placeholder="# My Project&#10;&#10;Start writing your README..."
              data-testid="readme-editor"
            />
          </div>
        )}

        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} flex flex-col`}>
            <div className="px-3 py-1 bg-[hsl(222,47%,12%)] border-b border-border/20 text-[10px] text-muted-foreground">
              Preview
            </div>
            <div
              className="flex-1 overflow-y-auto p-6 md-preview"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              data-testid="readme-rendered"
            />
          </div>
        )}
      </div>

      <div className="px-3 py-1 border-t border-border/30 bg-[hsl(222,47%,13%)] text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
        <span>{content.split("\n").length} lines</span>
        <span>{content.length} characters</span>
      </div>
    </div>
  );
}
