export interface SeccompProfile {
  id: string;
  name: string;
  defaultAction: string;
  allowedSyscalls: string[];
  blockedSyscalls: string[];
  active: boolean;
}

export interface AppArmorPolicy {
  id: string;
  name: string;
  mode: "enforce" | "complain" | "disabled";
  rules: string[];
  lastUpdated: string;
}

export interface SecurityFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "filesystem" | "privileges" | "capabilities" | "network";
}

export interface SecurityAudit {
  id: string;
  check: string;
  status: "pass" | "fail" | "warning";
  detail: string;
  timestamp: string;
}

const seccompProfiles: SeccompProfile[] = [
  { id: "sc1", name: "Default (Restricted)", defaultAction: "SCMP_ACT_ERRNO", allowedSyscalls: ["read", "write", "open", "close", "stat", "fstat", "mmap", "mprotect", "brk", "ioctl", "access", "pipe", "select", "clone", "execve", "exit_group", "fcntl", "getdents", "getcwd", "chdir", "socket", "connect", "sendto", "recvfrom", "bind", "listen", "accept"], blockedSyscalls: ["ptrace", "mount", "umount", "reboot", "swapon", "swapoff", "init_module", "delete_module", "kexec_load"], active: true },
  { id: "sc2", name: "Minimal (Build)", defaultAction: "SCMP_ACT_ERRNO", allowedSyscalls: ["read", "write", "open", "close", "stat", "fstat", "mmap", "brk", "execve", "exit_group", "clone", "fork", "wait4", "pipe", "dup2"], blockedSyscalls: ["ptrace", "mount", "socket", "connect", "bind", "listen", "accept", "reboot", "swapon"], active: false },
  { id: "sc3", name: "Network Allowed", defaultAction: "SCMP_ACT_ERRNO", allowedSyscalls: ["read", "write", "open", "close", "stat", "mmap", "brk", "socket", "connect", "sendto", "recvfrom", "bind", "listen", "accept", "epoll_create", "epoll_ctl", "epoll_wait", "poll", "select"], blockedSyscalls: ["ptrace", "mount", "reboot", "kexec_load", "init_module"], active: false },
];

const apparmorPolicies: AppArmorPolicy[] = [
  { id: "aa1", name: "container-default", mode: "enforce", rules: ["deny /proc/sys/** w", "deny /sys/** w", "deny /dev/** rw", "allow /app/** rw", "allow /tmp/** rw", "deny /etc/shadow r", "deny /etc/passwd w"], lastUpdated: new Date(Date.now() - 86400000).toISOString() },
  { id: "aa2", name: "network-restricted", mode: "complain", rules: ["deny network raw", "deny network packet", "allow network tcp", "allow network udp", "deny /proc/net/** w"], lastUpdated: new Date(Date.now() - 172800000).toISOString() },
  { id: "aa3", name: "file-strict", mode: "disabled", rules: ["deny /** w", "allow /app/src/** rw", "allow /tmp/** rw", "deny /app/node_modules/** w", "deny /app/.git/** w"], lastUpdated: new Date(Date.now() - 259200000).toISOString() },
];

const securityFlags: SecurityFlag[] = [
  { id: "f1", name: "Read-only Root Filesystem", description: "Mount root filesystem as read-only, only /app and /tmp writable", enabled: true, category: "filesystem" },
  { id: "f2", name: "No New Privileges", description: "Prevent child processes from gaining additional privileges via setuid/setgid", enabled: true, category: "privileges" },
  { id: "f3", name: "Drop All Capabilities", description: "Drop all Linux capabilities, only add back what's needed", enabled: true, category: "capabilities" },
  { id: "f4", name: "CAP_NET_BIND_SERVICE", description: "Allow binding to ports below 1024", enabled: false, category: "capabilities" },
  { id: "f5", name: "CAP_CHOWN", description: "Allow changing file ownership", enabled: false, category: "capabilities" },
  { id: "f6", name: "Disable Network Raw", description: "Prevent raw socket access (no ping, no packet sniffing)", enabled: true, category: "network" },
  { id: "f7", name: "Tmpfs /tmp", description: "Mount /tmp as tmpfs with size limit (64MB)", enabled: true, category: "filesystem" },
  { id: "f8", name: "No Privilege Escalation", description: "Prevent privilege escalation via su/sudo", enabled: true, category: "privileges" },
];

const auditResults: SecurityAudit[] = [
  { id: "au1", check: "Seccomp profile active", status: "pass", detail: "Default (Restricted) profile loaded", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "au2", check: "AppArmor enforcement", status: "pass", detail: "container-default in enforce mode", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "au3", check: "Read-only root filesystem", status: "pass", detail: "Root FS mounted read-only", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "au4", check: "No new privileges", status: "pass", detail: "Flag set on container", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "au5", check: "Capabilities dropped", status: "warning", detail: "CAP_NET_BIND_SERVICE still available", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "au6", check: "Writable paths", status: "pass", detail: "Only /app and /tmp writable", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "au7", check: "Privileged mode", status: "pass", detail: "Container not running in privileged mode", timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "au8", check: "Host PID namespace", status: "pass", detail: "Not sharing host PID namespace", timestamp: new Date(Date.now() - 300000).toISOString() },
];

export function getSeccompProfiles(projectId: string): SeccompProfile[] { return seccompProfiles; }
export function getAppArmorPolicies(projectId: string): AppArmorPolicy[] { return apparmorPolicies; }
export function getSecurityFlags(projectId: string): SecurityFlag[] { return securityFlags; }
export function getAuditResults(projectId: string): SecurityAudit[] { return auditResults; }

export function activateSeccomp(projectId: string, id: string): SeccompProfile | null {
  const p = seccompProfiles.find(x => x.id === id);
  if (!p) return null;
  seccompProfiles.forEach(s => s.active = false);
  p.active = true;
  return p;
}

export function setAppArmorMode(projectId: string, id: string, mode: "enforce" | "complain" | "disabled"): AppArmorPolicy | null {
  const p = apparmorPolicies.find(x => x.id === id);
  if (!p) return null;
  p.mode = mode;
  p.lastUpdated = new Date().toISOString();
  return p;
}

export function toggleFlag(projectId: string, flagId: string): SecurityFlag | null {
  const f = securityFlags.find(x => x.id === flagId);
  if (!f) return null;
  f.enabled = !f.enabled;
  return f;
}
