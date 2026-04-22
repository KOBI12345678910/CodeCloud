import { useState, useCallback, useRef } from "react";
import { Upload, FileUp, FolderUp, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface UploadItem {
  id: string;
  name: string;
  path: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface DropZoneProps {
  projectId: string;
  targetPath: string;
  onUpload: (file: { path: string; name: string; content: string; isDirectory: boolean }) => Promise<void>;
  onUploadComplete?: () => void;
  children: React.ReactNode;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

const TEXT_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".json", ".html", ".css", ".scss", ".less",
  ".md", ".txt", ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
  ".py", ".rb", ".go", ".rs", ".java", ".c", ".cpp", ".h", ".hpp",
  ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
  ".sql", ".graphql", ".gql", ".proto", ".env", ".gitignore",
  ".dockerfile", ".makefile", ".cmake", ".gradle",
  ".vue", ".svelte", ".astro", ".php", ".pl", ".pm", ".r", ".swift",
  ".kt", ".kts", ".scala", ".clj", ".ex", ".exs", ".erl", ".hs",
  ".lua", ".dart", ".elm", ".nim", ".zig", ".v", ".d",
  ".csv", ".tsv", ".log", ".lock",
]);

function isTextFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  if (!lower.includes(".")) return true;
  const ext = "." + lower.split(".").pop();
  return TEXT_EXTENSIONS.has(ext);
}

function getRelativePath(file: File, targetPath: string): string {
  const webkitPath = (file as any).webkitRelativePath;
  if (webkitPath) {
    const parts = webkitPath.split("/");
    parts.shift();
    const relative = parts.join("/");
    return targetPath ? `${targetPath}/${relative}` : relative;
  }
  return targetPath ? `${targetPath}/${file.name}` : file.name;
}

function collectDirectories(paths: string[]): string[] {
  const dirs = new Set<string>();
  for (const p of paths) {
    const parts = p.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }
  return Array.from(dirs).sort();
}

export default function DropZone({ projectId, targetPath, onUpload, onUploadComplete, children }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const items: UploadItem[] = files.map((f, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: f.name,
      path: getRelativePath(f, targetPath),
      status: "pending" as const,
    }));

    setUploads(items);
    setShowProgress(true);

    const allPaths = items.map((item) => item.path);
    const dirs = collectDirectories(allPaths);

    for (const dir of dirs) {
      const dirName = dir.split("/").pop() || dir;
      try {
        await onUpload({ path: dir, name: dirName, content: "", isDirectory: true });
      } catch {
        // directory might already exist
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const item = items[i]!;

      setUploads((prev) =>
        prev.map((u) => u.id === item.id ? { ...u, status: "uploading" } : u)
      );

      try {
        let content: string;
        if (isTextFile(file.name)) {
          content = await readFileAsText(file);
        } else {
          content = await readFileAsBase64(file);
        }

        await onUpload({
          path: item.path,
          name: file.name,
          content,
          isDirectory: false,
        });

        setUploads((prev) =>
          prev.map((u) => u.id === item.id ? { ...u, status: "done" } : u)
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id
              ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : u
          )
        );
      }
    }

    onUploadComplete?.();

    setTimeout(() => {
      setShowProgress(false);
      setUploads([]);
    }, 3000);
  }, [targetPath, onUpload, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const dismissProgress = useCallback(() => {
    setShowProgress(false);
    setUploads([]);
  }, []);

  const completedCount = uploads.filter((u) => u.status === "done").length;
  const errorCount = uploads.filter((u) => u.status === "error").length;
  const totalCount = uploads.length;
  const isUploading = uploads.some((u) => u.status === "uploading" || u.status === "pending");

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-blue-400 bg-[hsl(222,47%,11%)]/90 px-12 py-8">
            <Upload className="h-12 w-12 text-blue-400 animate-bounce" />
            <p className="text-lg font-medium text-blue-300">Drop files here to upload</p>
            <p className="text-sm text-gray-400">
              Files will be added to {targetPath || "project root"}
            </p>
          </div>
        </div>
      )}

      {showProgress && uploads.length > 0 && (
        <div className="absolute bottom-4 right-4 z-50 w-80 rounded-lg border border-[hsl(215,20%,25%)] bg-[hsl(222,47%,11%)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[hsl(215,20%,25%)] px-3 py-2">
            <div className="flex items-center gap-2">
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              ) : errorCount > 0 ? (
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-400" />
              )}
              <span className="text-sm font-medium text-gray-200">
                {isUploading
                  ? `Uploading ${completedCount}/${totalCount}...`
                  : errorCount > 0
                    ? `${completedCount} uploaded, ${errorCount} failed`
                    : `${completedCount} file${completedCount !== 1 ? "s" : ""} uploaded`}
              </span>
            </div>
            <button onClick={dismissProgress} className="text-gray-500 hover:text-gray-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto px-1 py-1">
            {uploads.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-2 py-1">
                {item.status === "pending" && (
                  <FileUp className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                )}
                {item.status === "uploading" && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-400" />
                )}
                {item.status === "done" && (
                  <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-400" />
                )}
                {item.status === "error" && (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <span
                  className={`truncate text-xs ${
                    item.status === "error" ? "text-red-400" : "text-gray-400"
                  }`}
                  title={item.error || item.path}
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>
          {isUploading && (
            <div className="px-3 pb-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(215,20%,20%)]">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
