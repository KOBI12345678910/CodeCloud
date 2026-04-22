export interface SSLCertificate {
  id: string;
  domain: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  status: "valid" | "expiring" | "expired" | "renewing" | "failed";
  chainValid: boolean;
  lastChecked: string;
  renewalHistory: RenewalEvent[];
}

export interface RenewalEvent {
  id: string;
  timestamp: string;
  action: "auto_renew" | "manual_renew" | "renewal_failed" | "cert_issued" | "alert_sent";
  details: string;
  success: boolean;
}

const certs: SSLCertificate[] = [
  {
    id: "ssl-1", domain: "codecloud.dev", issuer: "Let's Encrypt", issuedAt: new Date(Date.now() - 60 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    autoRenew: true, status: "valid", chainValid: true, lastChecked: new Date(Date.now() - 3600000).toISOString(),
    renewalHistory: [
      { id: "r1", timestamp: new Date(Date.now() - 60 * 86400000).toISOString(), action: "cert_issued", details: "Certificate issued by Let's Encrypt", success: true },
    ],
  },
  {
    id: "ssl-2", domain: "api.codecloud.dev", issuer: "Let's Encrypt", issuedAt: new Date(Date.now() - 75 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    autoRenew: true, status: "expiring", chainValid: true, lastChecked: new Date(Date.now() - 1800000).toISOString(),
    renewalHistory: [
      { id: "r2", timestamp: new Date(Date.now() - 75 * 86400000).toISOString(), action: "cert_issued", details: "Certificate issued", success: true },
      { id: "r3", timestamp: new Date(Date.now() - 3600000).toISOString(), action: "alert_sent", details: "Expiry warning: 15 days remaining", success: true },
      { id: "r4", timestamp: new Date(Date.now() - 1800000).toISOString(), action: "auto_renew", details: "Auto-renewal initiated", success: true },
    ],
  },
  {
    id: "ssl-3", domain: "staging.codecloud.dev", issuer: "Let's Encrypt", issuedAt: new Date(Date.now() - 95 * 86400000).toISOString(), expiresAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    autoRenew: true, status: "failed", chainValid: false, lastChecked: new Date(Date.now() - 900000).toISOString(),
    renewalHistory: [
      { id: "r5", timestamp: new Date(Date.now() - 95 * 86400000).toISOString(), action: "cert_issued", details: "Certificate issued", success: true },
      { id: "r6", timestamp: new Date(Date.now() - 35 * 86400000).toISOString(), action: "alert_sent", details: "Expiry warning: 30 days remaining", success: true },
      { id: "r7", timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), action: "auto_renew", details: "Auto-renewal failed: DNS validation timeout", success: false },
      { id: "r8", timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), action: "renewal_failed", details: "Certificate expired, renewal blocked by rate limit", success: false },
    ],
  },
  {
    id: "ssl-4", domain: "*.codecloud.dev", issuer: "DigiCert", issuedAt: new Date(Date.now() - 180 * 86400000).toISOString(), expiresAt: new Date(Date.now() + 185 * 86400000).toISOString(),
    autoRenew: false, status: "valid", chainValid: true, lastChecked: new Date(Date.now() - 7200000).toISOString(),
    renewalHistory: [
      { id: "r9", timestamp: new Date(Date.now() - 180 * 86400000).toISOString(), action: "cert_issued", details: "Wildcard certificate issued by DigiCert", success: true },
    ],
  },
];

export function getCertificates(): SSLCertificate[] { return certs; }

export function getCertificate(id: string): SSLCertificate | undefined { return certs.find(c => c.id === id); }

export function renewCertificate(id: string): SSLCertificate | null {
  const cert = certs.find(c => c.id === id);
  if (!cert) return null;
  cert.status = "renewing";
  cert.renewalHistory.push({ id: `r${Date.now()}`, timestamp: new Date().toISOString(), action: "manual_renew", details: "Manual renewal initiated", success: true });
  setTimeout(() => {
    cert.status = "valid";
    cert.expiresAt = new Date(Date.now() + 90 * 86400000).toISOString();
    cert.issuedAt = new Date().toISOString();
    cert.chainValid = true;
    cert.renewalHistory.push({ id: `r${Date.now()}`, timestamp: new Date().toISOString(), action: "cert_issued", details: "New certificate issued", success: true });
  }, 3000);
  return cert;
}

export function toggleAutoRenew(id: string): SSLCertificate | null {
  const cert = certs.find(c => c.id === id);
  if (!cert) return null;
  cert.autoRenew = !cert.autoRenew;
  return cert;
}
