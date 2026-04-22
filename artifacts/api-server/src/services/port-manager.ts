export interface PortInfo {
  port: number;
  pid: number;
  process: string;
  state: "listening" | "established";
  protocol: "tcp" | "udp";
  startedAt: Date;
  publicUrl?: string;
}

const activePorts = new Map<number, PortInfo>();
const forwardedPorts = new Map<number, string>();

const COMMON_PORTS: Record<number, string> = {
  3000: "React Dev Server",
  3001: "API Server",
  4000: "GraphQL Server",
  5000: "Flask / Vite",
  5173: "Vite Dev Server",
  5174: "Vite Preview",
  8000: "Python / Django",
  8080: "HTTP Server",
  8443: "HTTPS Server",
  8888: "Jupyter Notebook",
  9000: "PHP-FPM",
  9229: "Node.js Debugger",
  27017: "MongoDB",
  5432: "PostgreSQL",
  6379: "Redis",
  3306: "MySQL",
};

export function getProcessName(port: number, rawProcess?: string): string {
  if (rawProcess && rawProcess !== "unknown") return rawProcess;
  return COMMON_PORTS[port] || `Port ${port}`;
}

export function detectPorts(): PortInfo[] {
  const mockPorts: PortInfo[] = [
    { port: 3000, pid: 1234, process: "node", state: "listening", protocol: "tcp", startedAt: new Date(Date.now() - 120000) },
    { port: 5432, pid: 567, process: "postgres", state: "listening", protocol: "tcp", startedAt: new Date(Date.now() - 3600000) },
    { port: 8080, pid: 890, process: "node", state: "listening", protocol: "tcp", startedAt: new Date(Date.now() - 60000) },
  ];

  for (const p of mockPorts) {
    if (!activePorts.has(p.port)) {
      activePorts.set(p.port, p);
    }
  }

  return Array.from(activePorts.values()).map((p) => ({
    ...p,
    process: getProcessName(p.port, p.process),
    publicUrl: forwardedPorts.get(p.port),
  }));
}

export function forwardPort(port: number): string {
  const portInfo = activePorts.get(port);
  if (!portInfo) {
    throw new Error(`Port ${port} is not active`);
  }
  const publicUrl = `https://${port}-${process.env.REPLIT_DEV_DOMAIN || "localhost"}`;
  forwardedPorts.set(port, publicUrl);
  return publicUrl;
}

export function unforwardPort(port: number): void {
  forwardedPorts.delete(port);
}

export function closePort(port: number): boolean {
  const removed = activePorts.delete(port);
  forwardedPorts.delete(port);
  return removed;
}

export function getPortInfo(port: number): PortInfo | undefined {
  const info = activePorts.get(port);
  if (info) {
    return { ...info, process: getProcessName(info.port, info.process), publicUrl: forwardedPorts.get(port) };
  }
  return undefined;
}

export function addPort(port: number, pid: number, process: string): PortInfo {
  const info: PortInfo = {
    port, pid, process, state: "listening", protocol: "tcp", startedAt: new Date(),
  };
  activePorts.set(port, info);
  return { ...info, process: getProcessName(port, process) };
}
