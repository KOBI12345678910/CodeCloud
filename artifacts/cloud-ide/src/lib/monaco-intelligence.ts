const API = `${import.meta.env.VITE_API_URL || ""}/api`;

export interface GoToDefinitionResult {
  file: string;
  line: number;
  column: number;
  preview: string;
}

export async function goToDefinition(projectId: string, file: string, line: number, column: number): Promise<GoToDefinitionResult | null> {
  try {
    const res = await fetch(`${API}/projects/${projectId}/lsp/definition`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, line, column }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function findReferences(projectId: string, symbol: string): Promise<any[]> {
  try {
    const res = await fetch(`${API}/projects/${projectId}/lsp/references`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return [];
}

export async function getHoverInfo(projectId: string, file: string, line: number, column: number): Promise<any | null> {
  try {
    const res = await fetch(`${API}/projects/${projectId}/lsp/hover`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, line, column }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export async function renameSymbol(projectId: string, symbol: string, newName: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}/projects/${projectId}/lsp/rename`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, newName }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}
