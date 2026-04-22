import prettier from "prettier";

export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "html"
  | "css"
  | "json"
  | "markdown"
  | "yaml"
  | "graphql"
  | "python"
  | "go"
  | "rust";

const prettierParsers: Record<string, string> = {
  javascript: "babel",
  typescript: "typescript",
  html: "html",
  css: "css",
  json: "json",
  markdown: "markdown",
  yaml: "yaml",
  graphql: "graphql",
};

const extensionToLanguage: Record<string, SupportedLanguage> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "css",
  ".json": "json",
  ".md": "markdown",
  ".mdx": "markdown",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
};

export function detectLanguage(filename: string): SupportedLanguage | null {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return extensionToLanguage[ext] || null;
}

function indentPython(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];
  let indentLevel = 0;
  const indentSize = 4;
  const blockOpeners = /^\s*(def |class |if |elif |else:|for |while |with |try:|except |finally:|async def |async for |async with )/;
  const blockClosers = /^\s*(return|break|continue|pass|raise)\b/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "") {
      result.push("");
      continue;
    }

    if (/^(elif |else:|except |finally:)/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    result.push(" ".repeat(indentLevel * indentSize) + trimmed);

    if (trimmed.endsWith(":") && blockOpeners.test(trimmed)) {
      indentLevel++;
    }
    if (blockClosers.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
  }

  return result.join("\n");
}

export interface FormatResult {
  formatted: string;
  language: SupportedLanguage;
  success: boolean;
  error?: string;
}

export async function formatCode(
  code: string,
  language: SupportedLanguage,
  options?: {
    tabWidth?: number;
    useTabs?: boolean;
    printWidth?: number;
    singleQuote?: boolean;
    semi?: boolean;
    trailingComma?: "all" | "es5" | "none";
  }
): Promise<FormatResult> {
  const parser = prettierParsers[language];

  if (parser) {
    try {
      const formatted = await prettier.format(code, {
        parser,
        tabWidth: options?.tabWidth ?? 2,
        useTabs: options?.useTabs ?? false,
        printWidth: options?.printWidth ?? 80,
        singleQuote: options?.singleQuote ?? true,
        semi: options?.semi ?? true,
        trailingComma: options?.trailingComma ?? "es5",
      });
      return { formatted, language, success: true };
    } catch (err) {
      return {
        formatted: code,
        language,
        success: false,
        error: err instanceof Error ? err.message : "Formatting failed",
      };
    }
  }

  if (language === "python") {
    try {
      const formatted = indentPython(code);
      return { formatted, language, success: true };
    } catch (err) {
      return {
        formatted: code,
        language,
        success: false,
        error: err instanceof Error ? err.message : "Python formatting failed",
      };
    }
  }

  if (language === "go" || language === "rust") {
    return {
      formatted: code,
      language,
      success: false,
      error: `${language} formatting requires native toolchain (not available in browser IDE)`,
    };
  }

  return {
    formatted: code,
    language,
    success: false,
    error: `Unsupported language: ${language}`,
  };
}

export async function formatCodeByFilename(
  code: string,
  filename: string,
  options?: Parameters<typeof formatCode>[2]
): Promise<FormatResult> {
  const language = detectLanguage(filename);
  if (!language) {
    return {
      formatted: code,
      language: "javascript",
      success: false,
      error: `Cannot detect language for: ${filename}`,
    };
  }
  return formatCode(code, language, options);
}
