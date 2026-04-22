export interface BlameAnnotation {
  line: number;
  commitHash: string;
  author: string;
  date: string;
  message: string;
  avatarColor: string;
}

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
const AUTHORS = ["alice", "bob", "carol", "dave", "eve"];
const MESSAGES = [
  "Initial implementation",
  "Fix edge case in parser",
  "Refactor error handling",
  "Add input validation",
  "Update dependencies",
  "Optimize render loop",
  "Fix typo in variable name",
  "Add unit tests",
  "Improve type safety",
  "Handle null case",
];

export function generateBlameAnnotations(lineCount: number): BlameAnnotation[] {
  const annotations: BlameAnnotation[] = [];
  let currentAuthor = AUTHORS[0];
  let currentMessage = MESSAGES[0];
  let currentHash = randomHash();
  let currentDate = randomDate();
  let currentColor = COLORS[0];
  let blockSize = Math.floor(Math.random() * 8) + 2;
  let count = 0;

  for (let i = 1; i <= lineCount; i++) {
    if (count >= blockSize) {
      const authorIdx = Math.floor(Math.random() * AUTHORS.length);
      currentAuthor = AUTHORS[authorIdx];
      currentMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      currentHash = randomHash();
      currentDate = randomDate();
      currentColor = COLORS[authorIdx % COLORS.length];
      blockSize = Math.floor(Math.random() * 8) + 2;
      count = 0;
    }
    annotations.push({
      line: i,
      commitHash: currentHash,
      author: currentAuthor,
      date: currentDate,
      message: currentMessage,
      avatarColor: currentColor,
    });
    count++;
  }
  return annotations;
}

function randomHash(): string {
  return Array.from({ length: 7 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
}

function randomDate(): string {
  const daysAgo = Math.floor(Math.random() * 365);
  return new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
}

export function formatBlameGutter(annotation: BlameAnnotation): string {
  const ago = daysAgo(annotation.date);
  return `${annotation.author.padEnd(8)} ${ago.padStart(6)} ${annotation.commitHash}`;
}

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function registerBlameDecorations(
  monaco: any,
  editor: any,
  annotations: BlameAnnotation[],
): { dispose: () => void } {
  const decorations: any[] = [];

  for (const ann of annotations) {
    decorations.push({
      range: new monaco.Range(ann.line, 1, ann.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: "blame-glyph",
        glyphMarginHoverMessage: {
          value: `**${ann.author}** \`${ann.commitHash}\`\n\n${ann.message}\n\n_${ann.date}_`,
        },
        after: {
          content: ` ${formatBlameGutter(ann)} `,
          inlineClassName: "blame-inline-decoration",
        },
      },
    });
  }

  const ids = editor.deltaDecorations([], decorations);

  return {
    dispose: () => {
      editor.deltaDecorations(ids, []);
    },
  };
}
