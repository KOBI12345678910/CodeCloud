import { interpolate } from "@workspace/i18n";
import { loadServerBundle } from "./i18n";

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  html: boolean;
  locale: string;
  status: "queued" | "sent" | "failed";
  sentAt: Date | null;
  createdAt: Date;
}

function tr(locale: string, key: string, params?: Record<string, unknown>): string {
  const bundle = loadServerBundle(locale) ?? loadServerBundle("en") ?? {};
  return interpolate(bundle[key] ?? key, params);
}

class EmailService {
  private messages: EmailMessage[] = [];

  send(data: { to: string; subject: string; body: string; html?: boolean; locale?: string }): EmailMessage {
    const m: EmailMessage = {
      id: `email-${Date.now()}`,
      to: data.to,
      subject: data.subject,
      body: data.body,
      from: "noreply@codecloud.app",
      html: data.html || false,
      locale: data.locale ?? "en",
      status: "sent",
      sentAt: new Date(),
      createdAt: new Date(),
    };
    this.messages.push(m);
    return m;
  }

  sendWelcome(to: string, userName: string, locale = "en"): EmailMessage {
    return this.send({
      to,
      locale,
      subject: tr(locale, "email.welcome.subject"),
      body: tr(locale, "email.welcome.body", { name: userName }),
      html: true,
    });
  }

  sendPasswordReset(to: string, token: string, locale = "en"): EmailMessage {
    return this.send({
      to,
      locale,
      subject: tr(locale, "email.passwordReset.subject"),
      body: `${tr(locale, "email.passwordReset.body", { expiresIn: "1h" })}\nhttps://codecloud.app/reset?token=${token}`,
    });
  }

  sendDeployNotification(to: string, projectName: string, url: string, locale = "en"): EmailMessage {
    return this.send({
      to,
      locale,
      subject: tr(locale, "email.deploy.subject", { project: projectName }),
      body: tr(locale, "email.deploy.body", { url }),
    });
  }

  getHistory(to?: string): EmailMessage[] {
    return to ? this.messages.filter((m) => m.to === to) : this.messages;
  }
}

export const emailService = new EmailService();
