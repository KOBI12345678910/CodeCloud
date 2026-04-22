export interface NetworkConnection {
  id: string;
  containerId: string;
  protocol: "tcp" | "udp" | "unix";
  localAddr: string;
  localPort: number;
  remoteAddr: string;
  remotePort: number;
  state: "ESTABLISHED" | "LISTEN" | "TIME_WAIT" | "CLOSE_WAIT" | "SYN_SENT";
  pid: number;
  process: string;
}

export interface NetworkStats {
  containerId: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  activeConnections: number;
  listenPorts: number[];
  dnsQueries: number;
}

class NetworkDashboardService {
  private connections: Map<string, NetworkConnection[]> = new Map();
  private stats: Map<string, NetworkStats> = new Map();

  setConnections(containerId: string, conns: Omit<NetworkConnection, "id" | "containerId">[]): void {
    this.connections.set(containerId, conns.map(c => ({
      ...c, id: `conn-${Math.random().toString(36).slice(2, 8)}`, containerId,
    })));
  }

  getConnections(containerId: string): NetworkConnection[] { return this.connections.get(containerId) || []; }

  updateStats(containerId: string, stats: Omit<NetworkStats, "containerId">): void {
    this.stats.set(containerId, { ...stats, containerId });
  }

  getStats(containerId: string): NetworkStats | null { return this.stats.get(containerId) || null; }

  getOverview(): { containers: string[]; totalConnections: number; totalBytesIn: number; totalBytesOut: number } {
    let totalConns = 0, totalIn = 0, totalOut = 0;
    for (const conns of this.connections.values()) totalConns += conns.length;
    for (const s of this.stats.values()) { totalIn += s.bytesIn; totalOut += s.bytesOut; }
    return { containers: Array.from(this.connections.keys()), totalConnections: totalConns, totalBytesIn: totalIn, totalBytesOut: totalOut };
  }
}

export const networkDashboardService = new NetworkDashboardService();
