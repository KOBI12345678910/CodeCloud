export interface ImportSuggestion {
  module: string;
  importStatement: string;
  type: "named" | "default" | "namespace";
  source: "package" | "local" | "builtin";
  confidence: number;
}

const COMMON_IMPORTS: Record<string, { module: string; type: "named" | "default" | "namespace" }> = {
  useState: { module: "react", type: "named" },
  useEffect: { module: "react", type: "named" },
  useCallback: { module: "react", type: "named" },
  useMemo: { module: "react", type: "named" },
  useRef: { module: "react", type: "named" },
  useContext: { module: "react", type: "named" },
  useReducer: { module: "react", type: "named" },
  React: { module: "react", type: "default" },
  Router: { module: "express", type: "named" },
  Request: { module: "express", type: "named" },
  Response: { module: "express", type: "named" },
  NextFunction: { module: "express", type: "named" },
  z: { module: "zod", type: "named" },
  clsx: { module: "clsx", type: "default" },
  axios: { module: "axios", type: "default" },
  fs: { module: "fs", type: "namespace" },
  path: { module: "path", type: "namespace" },
  Link: { module: "wouter", type: "named" },
  useLocation: { module: "wouter", type: "named" },
  useQuery: { module: "@tanstack/react-query", type: "named" },
  useMutation: { module: "@tanstack/react-query", type: "named" },
  eq: { module: "drizzle-orm", type: "named" },
  and: { module: "drizzle-orm", type: "named" },
  or: { module: "drizzle-orm", type: "named" },
  desc: { module: "drizzle-orm", type: "named" },
};

export function analyzeImports(code: string, existingImports: string[]): ImportSuggestion[] {
  const suggestions: ImportSuggestion[] = [];
  const importedNames = new Set<string>();

  for (const imp of existingImports) {
    const match = imp.match(/import\s+(?:\{([^}]+)\}|(\w+))/);
    if (match) {
      if (match[1]) match[1].split(",").forEach(n => importedNames.add(n.trim().split(" as ")[0]));
      if (match[2]) importedNames.add(match[2]);
    }
  }

  const identifiers = code.match(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g) || [];
  const uniqueIds = [...new Set(identifiers)];

  for (const id of uniqueIds) {
    if (importedNames.has(id)) continue;
    const known = COMMON_IMPORTS[id];
    if (known) {
      const stmt = known.type === "named" ? `import { ${id} } from "${known.module}";` : known.type === "default" ? `import ${id} from "${known.module}";` : `import * as ${id} from "${known.module}";`;
      suggestions.push({ module: known.module, importStatement: stmt, type: known.type, source: ["fs", "path", "os", "crypto", "http", "https", "url", "util"].includes(known.module) ? "builtin" : "package", confidence: 0.95 });
    }
  }

  return suggestions;
}

export function organizeImports(imports: string[]): string[] {
  const builtins: string[] = [];
  const packages: string[] = [];
  const locals: string[] = [];

  for (const imp of imports) {
    if (/from\s+["'](fs|path|os|crypto|http|https|url|util|stream|events|child_process)["']/.test(imp)) builtins.push(imp);
    else if (/from\s+["']\./.test(imp) || /from\s+["']@\//.test(imp)) locals.push(imp);
    else packages.push(imp);
  }

  const result: string[] = [];
  if (builtins.length) { result.push(...builtins.sort()); result.push(""); }
  if (packages.length) { result.push(...packages.sort()); result.push(""); }
  if (locals.length) { result.push(...locals.sort()); }
  return result;
}
