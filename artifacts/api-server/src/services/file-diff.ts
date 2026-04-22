export interface DiffChunk {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number;
  newLineNumber: number | null;
}

export interface FileDiff {
  oldFile: string;
  newFile: string;
  chunks: DiffChunk[];
  additions: number;
  deletions: number;
  unchanged: number;
}

class FileDiffService {
  diff(oldContent: string, newContent: string, oldFile: string = "old", newFile: string = "new"): FileDiff {
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");
    const chunks: DiffChunk[] = [];
    let additions = 0, deletions = 0, unchanged = 0;
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < oldLines.length && i < newLines.length) {
        if (oldLines[i] === newLines[i]) {
          chunks.push({ type: "unchanged", content: oldLines[i], lineNumber: i + 1, newLineNumber: i + 1 });
          unchanged++;
        } else {
          chunks.push({ type: "removed", content: oldLines[i], lineNumber: i + 1, newLineNumber: null });
          chunks.push({ type: "added", content: newLines[i], lineNumber: i + 1, newLineNumber: i + 1 });
          additions++; deletions++;
        }
      } else if (i < oldLines.length) {
        chunks.push({ type: "removed", content: oldLines[i], lineNumber: i + 1, newLineNumber: null });
        deletions++;
      } else {
        chunks.push({ type: "added", content: newLines[i], lineNumber: i + 1, newLineNumber: i + 1 });
        additions++;
      }
    }
    return { oldFile, newFile, chunks, additions, deletions, unchanged };
  }
}

export const fileDiffService = new FileDiffService();
