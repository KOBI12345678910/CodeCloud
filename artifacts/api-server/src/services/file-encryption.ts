export interface EncryptedFile {
  path: string;
  encrypted: boolean;
  algorithm: string;
  keyId: string;
  encryptedAt: string;
  originalSize: number;
  encryptedSize: number;
}

export interface EncryptionKey {
  id: string;
  name: string;
  algorithm: string;
  createdAt: string;
  rotatedAt?: string;
  status: "active" | "rotated" | "revoked";
  filesEncrypted: number;
}

export interface EncryptionStatus {
  projectId: string;
  enabled: boolean;
  totalFiles: number;
  encryptedFiles: number;
  keys: EncryptionKey[];
  encryptedFileList: EncryptedFile[];
}

const SAMPLE_KEYS: EncryptionKey[] = [
  { id: "key-1", name: "Primary Key", algorithm: "AES-256-GCM", createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), rotatedAt: new Date(Date.now() - 7 * 86400000).toISOString(), status: "active", filesEncrypted: 5 },
  { id: "key-2", name: "Previous Key", algorithm: "AES-256-GCM", createdAt: new Date(Date.now() - 180 * 86400000).toISOString(), status: "rotated", filesEncrypted: 0 },
];

const SAMPLE_ENCRYPTED: EncryptedFile[] = [
  { path: ".env", encrypted: true, algorithm: "AES-256-GCM", keyId: "key-1", encryptedAt: new Date(Date.now() - 86400000).toISOString(), originalSize: 1024, encryptedSize: 1088 },
  { path: ".env.production", encrypted: true, algorithm: "AES-256-GCM", keyId: "key-1", encryptedAt: new Date(Date.now() - 86400000).toISOString(), originalSize: 2048, encryptedSize: 2112 },
  { path: "config/secrets.json", encrypted: true, algorithm: "AES-256-GCM", keyId: "key-1", encryptedAt: new Date(Date.now() - 43200000).toISOString(), originalSize: 4096, encryptedSize: 4160 },
  { path: "certs/private.key", encrypted: true, algorithm: "AES-256-GCM", keyId: "key-1", encryptedAt: new Date(Date.now() - 172800000).toISOString(), originalSize: 3243, encryptedSize: 3307 },
  { path: "config/database.yml", encrypted: true, algorithm: "AES-256-GCM", keyId: "key-1", encryptedAt: new Date(Date.now() - 259200000).toISOString(), originalSize: 512, encryptedSize: 576 },
];

export function getEncryptionStatus(projectId: string): EncryptionStatus {
  return {
    projectId,
    enabled: true,
    totalFiles: 142,
    encryptedFiles: SAMPLE_ENCRYPTED.length,
    keys: SAMPLE_KEYS,
    encryptedFileList: SAMPLE_ENCRYPTED,
  };
}

export function encryptFile(projectId: string, filePath: string): EncryptedFile {
  return {
    path: filePath, encrypted: true, algorithm: "AES-256-GCM", keyId: "key-1",
    encryptedAt: new Date().toISOString(), originalSize: Math.floor(Math.random() * 10000) + 100,
    encryptedSize: Math.floor(Math.random() * 10000) + 164,
  };
}

export function decryptFile(projectId: string, filePath: string): { success: boolean; path: string } {
  return { success: true, path: filePath };
}

export function rotateKey(projectId: string, keyId: string): EncryptionKey {
  return { id: crypto.randomUUID(), name: "New Primary Key", algorithm: "AES-256-GCM", createdAt: new Date().toISOString(), status: "active", filesEncrypted: 0 };
}
