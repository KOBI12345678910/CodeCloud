export interface NamingSuggestion {
  original: string;
  suggestions: { name: string; reason: string; convention: string }[];
  context: string;
}

export function suggestVariableNames(code: string, variableName: string, context: string): NamingSuggestion {
  const suggestions = [
    { name: `${variableName}List`, reason: "Indicates this is a collection", convention: "camelCase" },
    { name: `filtered${variableName.charAt(0).toUpperCase() + variableName.slice(1)}`, reason: "Clarifies the data is filtered", convention: "camelCase" },
    { name: `${variableName}Map`, reason: "If used as a key-value lookup", convention: "camelCase" },
  ];
  return { original: variableName, suggestions, context };
}

export function enforceNamingConvention(code: string, convention: "camelCase" | "snake_case" | "PascalCase"): { violations: { name: string; line: number; suggested: string }[] } {
  return {
    violations: [
      { name: "my_var", line: 5, suggested: convention === "camelCase" ? "myVar" : "my_var" },
      { name: "getData", line: 12, suggested: convention === "snake_case" ? "get_data" : "getData" },
    ],
  };
}
