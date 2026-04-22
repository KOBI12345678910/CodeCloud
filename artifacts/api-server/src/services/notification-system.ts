export interface Notification {
  id: string;
  userId: string;
  type: "info" | "success" | "warning" | "error" | "mention" | "deploy" | "review";
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  deployAlerts: boolean;
  reviewRequests: boolean;
  mentions: boolean;
}

class NotificationSystemService {
  private notifications: Map<string, Notification[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();

  send(userId: string, data: { type: Notification["type"]; title: string; message: string; actionUrl?: string }): Notification {
    if (!this.notifications.has(userId)) this.notifications.set(userId, []);
    const notif: Notification = { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId, ...data, read: false, actionUrl: data.actionUrl || null, createdAt: new Date() };
    this.notifications.get(userId)!.push(notif);
    return notif;
  }

  list(userId: string, unreadOnly: boolean = false): Notification[] {
    let notifs = this.notifications.get(userId) || [];
    if (unreadOnly) notifs = notifs.filter(n => !n.read);
    return notifs.slice().reverse();
  }

  markRead(userId: string, notifId: string): boolean {
    const notifs = this.notifications.get(userId); if (!notifs) return false;
    const n = notifs.find(n => n.id === notifId); if (!n) return false;
    n.read = true; return true;
  }

  markAllRead(userId: string): number {
    const notifs = this.notifications.get(userId); if (!notifs) return 0;
    let count = 0;
    for (const n of notifs) { if (!n.read) { n.read = true; count++; } }
    return count;
  }

  getUnreadCount(userId: string): number { return (this.notifications.get(userId) || []).filter(n => !n.read).length; }

  setPreferences(userId: string, prefs: Partial<NotificationPreferences>): NotificationPreferences {
    const existing = this.preferences.get(userId) || { userId, email: true, push: true, inApp: true, deployAlerts: true, reviewRequests: true, mentions: true };
    Object.assign(existing, prefs);
    this.preferences.set(userId, existing);
    return existing;
  }

  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || { userId, email: true, push: true, inApp: true, deployAlerts: true, reviewRequests: true, mentions: true };
  }

  delete(userId: string, notifId: string): boolean {
    const notifs = this.notifications.get(userId); if (!notifs) return false;
    const idx = notifs.findIndex(n => n.id === notifId); if (idx === -1) return false;
    notifs.splice(idx, 1); return true;
  }
}

export const notificationSystemService = new NotificationSystemService();
