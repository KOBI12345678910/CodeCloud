export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const emailQueue: EmailOptions[] = [];

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">
<div style="text-align:center;margin-bottom:32px">
<div style="display:inline-block;background:#3b82f6;border-radius:8px;padding:8px 12px">
<span style="color:white;font-weight:700;font-size:18px">&lt;/&gt; CodeCloud</span>
</div>
</div>
<div style="background:#1e293b;border-radius:12px;padding:32px;border:1px solid #334155">
<h2 style="color:#f1f5f9;margin:0 0 16px;font-size:20px">${title}</h2>
${body}
</div>
<div style="text-align:center;margin-top:24px">
<p style="color:#64748b;font-size:12px;margin:0">&copy; ${new Date().getFullYear()} CodeCloud. All rights reserved.</p>
</div>
</div>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0">${text}</a>`;
}

function p(text: string): string {
  return `<p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 12px">${text}</p>`;
}

export function welcomeEmail(username: string, loginUrl: string): EmailOptions {
  return {
    to: "",
    subject: "Welcome to CodeCloud!",
    html: baseTemplate(
      `Welcome, ${username}!`,
      `${p("Thanks for joining CodeCloud. You're ready to start building amazing projects in your browser.")}
      ${p("Here's what you can do:")}
      <ul style="color:#cbd5e1;font-size:14px;line-height:1.8;padding-left:20px;margin:12px 0">
        <li>Create projects with 10+ templates</li>
        <li>Code with Monaco editor + AI assistant</li>
        <li>Deploy with one click</li>
        <li>Collaborate in real-time</li>
      </ul>
      <div style="text-align:center">${btn("Start Coding", loginUrl)}</div>`
    ),
  };
}

export function passwordResetEmail(resetUrl: string, expiresIn: string): EmailOptions {
  return {
    to: "",
    subject: "Reset Your Password - CodeCloud",
    html: baseTemplate(
      "Reset Your Password",
      `${p("We received a request to reset your password. Click the button below to create a new password.")}
      <div style="text-align:center">${btn("Reset Password", resetUrl)}</div>
      ${p(`This link expires in ${expiresIn}. If you didn't request this, ignore this email.`)}`
    ),
  };
}

export function emailVerificationEmail(verifyUrl: string): EmailOptions {
  return {
    to: "",
    subject: "Verify Your Email - CodeCloud",
    html: baseTemplate(
      "Verify Your Email",
      `${p("Please verify your email address to unlock all features.")}
      <div style="text-align:center">${btn("Verify Email", verifyUrl)}</div>
      ${p("If you didn't create an account, you can safely ignore this.")}`
    ),
  };
}

export function collaborationInviteEmail(
  inviterName: string,
  projectName: string,
  role: string,
  acceptUrl: string
): EmailOptions {
  return {
    to: "",
    subject: `${inviterName} invited you to ${projectName} - CodeCloud`,
    html: baseTemplate(
      "Collaboration Invite",
      `${p(`<strong>${inviterName}</strong> invited you to collaborate on <strong>${projectName}</strong> as a <strong>${role}</strong>.`)}
      <div style="text-align:center">${btn("Accept Invite", acceptUrl)}</div>`
    ),
  };
}

export function deploymentNotificationEmail(
  projectName: string,
  status: string,
  url: string
): EmailOptions {
  const isSuccess = status === "success";
  return {
    to: "",
    subject: `Deployment ${isSuccess ? "Succeeded" : "Failed"}: ${projectName}`,
    html: baseTemplate(
      `Deployment ${isSuccess ? "Succeeded" : "Failed"}`,
      `${p(`Your deployment of <strong>${projectName}</strong> has ${isSuccess ? "completed successfully" : "failed"}.`)}
      ${isSuccess ? `<div style="text-align:center">${btn("View Deployment", url)}</div>` : p("Check your project settings for details.")}`
    ),
  };
}

export function weeklyDigestEmail(
  username: string,
  stats: { projects: number; commits: number; deploys: number }
): EmailOptions {
  return {
    to: "",
    subject: "Your Weekly CodeCloud Digest",
    html: baseTemplate(
      `Weekly Digest`,
      `${p(`Hey ${username}, here's your week in review:`)}
      <div style="display:flex;gap:16px;margin:16px 0">
        <div style="flex:1;background:#0f172a;border-radius:8px;padding:16px;text-align:center">
          <div style="color:#3b82f6;font-size:24px;font-weight:700">${stats.projects}</div>
          <div style="color:#94a3b8;font-size:12px">Projects</div>
        </div>
        <div style="flex:1;background:#0f172a;border-radius:8px;padding:16px;text-align:center">
          <div style="color:#10b981;font-size:24px;font-weight:700">${stats.commits}</div>
          <div style="color:#94a3b8;font-size:12px">Saves</div>
        </div>
        <div style="flex:1;background:#0f172a;border-radius:8px;padding:16px;text-align:center">
          <div style="color:#f59e0b;font-size:24px;font-weight:700">${stats.deploys}</div>
          <div style="color:#94a3b8;font-size:12px">Deploys</div>
        </div>
      </div>
      ${p("Keep building! Your next great project is just a click away.")}`
    ),
  };
}

export function transferRequestEmail(
  fromUsername: string,
  projectName: string,
  message: string | null,
  acceptUrl: string,
  declineUrl: string
): EmailOptions {
  return {
    to: "",
    subject: `${fromUsername} wants to transfer "${projectName}" to you - CodeCloud`,
    html: baseTemplate(
      "Project Transfer Request",
      `${p(`<strong>${fromUsername}</strong> wants to transfer ownership of <strong>${projectName}</strong> to you.`)}
      ${message ? p(`Message: "${message}"`) : ""}
      ${p("As the new owner, you'll have full control over the project including settings, collaborators, and deployments. All existing collaborators will keep their access.")}
      <div style="text-align:center;margin:20px 0">
        ${btn("Accept Transfer", acceptUrl)}
      </div>
      <div style="text-align:center">
        <a href="${declineUrl}" style="color:#94a3b8;font-size:13px;text-decoration:underline">Decline Transfer</a>
      </div>
      ${p("This transfer request expires in 7 days.")}`
    ),
  };
}

export function transferConfirmationEmail(
  projectName: string,
  newOwnerUsername: string,
  isOriginalOwner: boolean
): EmailOptions {
  const title = isOriginalOwner ? "Transfer Complete" : "You're the New Owner";
  const body = isOriginalOwner
    ? `${p(`Your project <strong>${projectName}</strong> has been transferred to <strong>${newOwnerUsername}</strong>.`)}
       ${p("You've been added as an admin collaborator so you still have access to the project.")}`
    : `${p(`You are now the owner of <strong>${projectName}</strong>.`)}
       ${p("You have full control over the project. The previous owner has been added as an admin collaborator.")}`;

  return {
    to: "",
    subject: `Project Transfer ${isOriginalOwner ? "Complete" : "Accepted"}: ${projectName} - CodeCloud`,
    html: baseTemplate(title, body),
  };
}

export function transferDeclinedEmail(
  projectName: string,
  recipientUsername: string
): EmailOptions {
  return {
    to: "",
    subject: `Transfer Declined: ${projectName} - CodeCloud`,
    html: baseTemplate(
      "Transfer Declined",
      `${p(`<strong>${recipientUsername}</strong> has declined the ownership transfer of <strong>${projectName}</strong>.`)}
      ${p("The project remains under your ownership with no changes.")}`
    ),
  };
}

export function transferCancelledEmail(
  projectName: string,
  fromUsername: string
): EmailOptions {
  return {
    to: "",
    subject: `Transfer Cancelled: ${projectName} - CodeCloud`,
    html: baseTemplate(
      "Transfer Cancelled",
      `${p(`<strong>${fromUsername}</strong> has cancelled the ownership transfer of <strong>${projectName}</strong>.`)}
      ${p("No changes have been made to the project.")}`
    ),
  };
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  emailQueue.push(options);
  console.log(`[email] Queued email to ${options.to}: ${options.subject}`);
  return true;
}

export function getEmailQueue(): EmailOptions[] {
  return [...emailQueue];
}

export function clearEmailQueue(): void {
  emailQueue.length = 0;
}
