export interface SearchResult {
  file: string;
  line: number;
  column: number;
  matchText: string;
  context: string;
  lineContent: string;
}

export interface SearchOptions {
  query: string;
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  includePattern: string | null;
  excludePattern: string | null;
  maxResults: number;
}

class CodeSearchService {
  search(files: { path: string; content: string }[], options: SearchOptions): SearchResult[] {
    const results: SearchResult[] = [];
    let pattern: RegExp;
    try {
      let flags = "g" + (options.caseSensitive ? "" : "i");
      let src = options.isRegex ? options.query : options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (options.wholeWord) src = `\\b${src}\\b`;
      pattern = new RegExp(src, flags);
    } catch { return []; }

    for (const file of files) {
      if (options.includePattern && !new RegExp(options.includePattern).test(file.path)) continue;
      if (options.excludePattern && new RegExp(options.excludePattern).test(file.path)) continue;
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length && results.length < options.maxResults; i++) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(lines[i])) && results.length < options.maxResults) {
          results.push({
            file: file.path, line: i + 1, column: match.index + 1,
            matchText: match[0], lineContent: lines[i],
            context: lines.slice(Math.max(0, i - 2), i + 3).join("\n"),
          });
        }
      }
    }
    return results;
  }

  replace(content: string, options: SearchOptions, replacement: string): { result: string; count: number } {
    let flags = "g" + (options.caseSensitive ? "" : "i");
    let src = options.isRegex ? options.query : options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (options.wholeWord) src = `\\b${src}\\b`;
    let count = 0;
    const result = content.replace(new RegExp(src, flags), () => { count++; return replacement; });
    return { result, count };
  }
}

export const codeSearchService = new CodeSearchService();
