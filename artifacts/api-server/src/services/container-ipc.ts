export interface IPCChannel {
  id: string;
  containerId: string;
  type: "shared_memory" | "unix_socket" | "named_pipe";
  name: string;
  endpoint: string;
  status: "open" | "closed" | "error";
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  createdAt: Date;
}

export interface IPCMessage {
  id: string;
  channelId: string;
  sender: string;
  receiver: string;
  payload: string;
  size: number;
  timestamp: Date;
  latencyUs: number;
}

class ContainerIPCService {
  private channels: Map<string, IPCChannel> = new Map();
  private messages: IPCMessage[] = [];

  createChannel(containerId: string, type: IPCChannel["type"], name: string): IPCChannel {
    const id = `ipc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const endpoints: Record<string, string> = {
      shared_memory: `/dev/shm/${name}`,
      unix_socket: `/var/run/${name}.sock`,
      named_pipe: `/tmp/${name}.pipe`,
    };
    const ch: IPCChannel = {
      id, containerId, type, name, endpoint: endpoints[type],
      status: "open", messagesSent: 0, messagesReceived: 0, bytesTransferred: 0, createdAt: new Date(),
    };
    this.channels.set(id, ch);
    return ch;
  }

  send(channelId: string, sender: string, receiver: string, payload: string): IPCMessage | null {
    const ch = this.channels.get(channelId);
    if (!ch || ch.status !== "open") return null;
    const msg: IPCMessage = {
      id: `msg-${Date.now()}`, channelId, sender, receiver, payload,
      size: payload.length, timestamp: new Date(), latencyUs: Math.floor(Math.random() * 100) + 5,
    };
    ch.messagesSent++;
    ch.messagesReceived++;
    ch.bytesTransferred += msg.size;
    this.messages.push(msg);
    return msg;
  }

  getChannels(containerId?: string): IPCChannel[] {
    const all = Array.from(this.channels.values());
    return containerId ? all.filter(c => c.containerId === containerId) : all;
  }

  getMessages(channelId: string): IPCMessage[] {
    return this.messages.filter(m => m.channelId === channelId).slice(-100);
  }

  closeChannel(id: string): boolean {
    const ch = this.channels.get(id);
    if (!ch) return false;
    ch.status = "closed";
    return true;
  }
}

export const containerIPCService = new ContainerIPCService();
