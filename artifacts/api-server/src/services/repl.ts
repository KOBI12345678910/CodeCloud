import { spawn } from "child_process";

export type ReplLanguage = "nodejs" | "python" | "ruby";

interface ReplResult {
  output: string;
  error: string;
  exitCode: number;
  duration: number;
}

const TIMEOUT_MS = 10000;

const LANGUAGE_CONFIG: Record<ReplLanguage, { cmd: string; args: string[]; wrapExpression: (code: string) => string }> = {
  nodejs: {
    cmd: "node",
    args: ["-e"],
    wrapExpression: (code: string) => {
      const escaped = code.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
      return `try { const __r = eval(\`${escaped}\`); if (__r !== undefined) console.log(typeof __r === 'object' ? JSON.stringify(__r, null, 2) : String(__r)); } catch(e) { console.error(e.message); process.exit(1); }`;
    },
  },
  python: {
    cmd: "python3",
    args: ["-c"],
    wrapExpression: (code: string) => {
      const lines = code.split("\n");
      if (lines.length === 1 && !code.includes("=") && !code.startsWith("import ") && !code.startsWith("from ") && !code.startsWith("def ") && !code.startsWith("class ") && !code.startsWith("if ") && !code.startsWith("for ") && !code.startsWith("while ") && !code.startsWith("try:") && !code.startsWith("print(")) {
        return `
import json, sys
try:
    __r = eval(${JSON.stringify(code)})
    if __r is not None:
        try:
            print(json.dumps(__r, indent=2, default=str))
        except:
            print(repr(__r))
except SyntaxError:
    exec(${JSON.stringify(code)})
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
`;
      }
      return code;
    },
  },
  ruby: {
    cmd: "ruby",
    args: ["-e"],
    wrapExpression: (code: string) => {
      const lines = code.split("\n");
      if (lines.length === 1 && !code.startsWith("puts ") && !code.startsWith("print ") && !code.startsWith("require ") && !code.startsWith("def ") && !code.startsWith("class ")) {
        return `begin; __r = (${code}); puts __r.inspect unless __r.nil?; rescue => e; STDERR.puts e.message; exit 1; end`;
      }
      return code;
    },
  },
};

export function getSupportedLanguages(): ReplLanguage[] {
  return ["nodejs", "python", "ruby"];
}

export async function executeRepl(language: ReplLanguage, code: string): Promise<ReplResult> {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return { output: "", error: `Unsupported language: ${language}`, exitCode: 1, duration: 0 };
  }

  const trimmed = code.trim();
  if (!trimmed) {
    return { output: "", error: "", exitCode: 0, duration: 0 };
  }

  const wrappedCode = config.wrapExpression(trimmed);
  const start = Date.now();

  return new Promise((resolve) => {
    const proc = spawn(config.cmd, [...config.args, wrappedCode], {
      timeout: TIMEOUT_MS,
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    proc.on("close", (exitCode) => {
      resolve({
        output: stdout.trimEnd(),
        error: stderr.trimEnd(),
        exitCode: exitCode ?? 1,
        duration: Date.now() - start,
      });
    });

    proc.on("error", (err) => {
      resolve({
        output: "",
        error: err.message,
        exitCode: 1,
        duration: Date.now() - start,
      });
    });
  });
}
