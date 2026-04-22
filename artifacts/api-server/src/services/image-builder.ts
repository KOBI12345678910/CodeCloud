export interface BuildResult {
  id: string;
  status: string;
  imageName: string;
  imageTag: string;
  size: number;
  layers: { instruction: string; size: number; cached: boolean }[];
  buildTime: number;
  createdAt: string;
}

export interface ImageAnalysis {
  totalSize: number;
  layerCount: number;
  layers: { instruction: string; size: number; percentage: number }[];
  suggestions: string[];
  baseImage: string;
  multistage: boolean;
}

export function analyzeDockerfile(content: string): ImageAnalysis {
  const lines = content.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  const froms = lines.filter(l => /^FROM\s/i.test(l.trim()));
  const multistage = froms.length > 1;
  const baseImage = froms[0]?.replace(/^FROM\s+/i, "").split(" ")[0] || "unknown";

  const layers: { instruction: string; size: number; percentage: number }[] = [];
  let totalSize = 0;

  for (const line of lines) {
    const instruction = line.trim().split(/\s/)[0].toUpperCase();
    const size = instruction === "COPY" ? 5000000 : instruction === "RUN" ? 15000000 : instruction === "ADD" ? 8000000 : 1000;
    totalSize += size;
    layers.push({ instruction: line.trim().substring(0, 80), size, percentage: 0 });
  }

  layers.forEach(l => { l.percentage = totalSize > 0 ? Math.round((l.size / totalSize) * 100) : 0; });

  const suggestions: string[] = [];
  if (!multistage) suggestions.push("Consider using multi-stage builds to reduce image size");
  if (lines.some(l => /^RUN apt-get/i.test(l.trim()) && !l.includes("--no-install-recommends")))
    suggestions.push("Use --no-install-recommends with apt-get to reduce image size");
  if (!lines.some(l => /^RUN.*rm.*\/var\/lib\/apt/i.test(l.trim())) && lines.some(l => /apt-get/i.test(l)))
    suggestions.push("Clean up apt cache after installing packages");
  if (lines.filter(l => /^RUN /i.test(l.trim())).length > 5)
    suggestions.push("Combine multiple RUN commands to reduce layers");
  if (!lines.some(l => /^\.dockerignore/i.test(l)))
    suggestions.push("Ensure .dockerignore exists to exclude unnecessary files");
  if (baseImage.includes("latest"))
    suggestions.push("Pin base image version instead of using :latest tag");

  return { totalSize, layerCount: layers.length, layers, suggestions, baseImage, multistage };
}

export function simulateBuild(dockerfile: string, imageName: string, tag = "latest"): BuildResult {
  const analysis = analyzeDockerfile(dockerfile);
  return {
    id: crypto.randomUUID(),
    status: "completed",
    imageName,
    imageTag: tag,
    size: analysis.totalSize,
    layers: analysis.layers.map(l => ({ instruction: l.instruction, size: l.size, cached: Math.random() > 0.5 })),
    buildTime: Math.floor(Math.random() * 30000) + 5000,
    createdAt: new Date().toISOString(),
  };
}
