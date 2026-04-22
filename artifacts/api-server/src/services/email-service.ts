export interface EmailMessage { id: string; to: string; from: string; subject: string; body: string; html: boolean; status: "queued" | "sent" | "failed"; sentAt: Date | null; createdAt: Date; }
class EmailService {
  private messages: EmailMessage[] = [];
  send(data: { to: string; subject: string; body: string; html?: boolean }): EmailMessage {
    const m: EmailMessage = { id: `email-${Date.now()}`, ...data, from: "noreply@codecloud.app", html: data.html || false, status: "sent", sentAt: new Date(), createdAt: new Date() };
    this.messages.push(m); return m;
  }
  sendWelcome(to: string, userName: string): EmailMessage { return this.send({ to, subject: "Welcome to CodeCloud!", body: `Hi ${userName}, welcome to CodeCloud! Start coding today.`, html: true }); }
  sendPasswordReset(to: string, token: string): EmailMessage { return this.send({ to, subject: "Reset your password", body: `Click here to reset: https://codecloud.app/reset?token=${token}` }); }
  sendDeployNotification(to: string, projectName: string, url: string): EmailMessage { return this.send({ to, subject: `${projectName} deployed`, body: `Your project has been deployed to ${url}` }); }
  getHistory(to?: string): EmailMessage[] { return to ? this.messages.filter(m => m.to === to) : this.messages; }
}
export const emailService = new EmailService();
