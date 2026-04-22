export interface VolumeEncryption {
  volumeId: string;
  projectId: string;
  encrypted: boolean;
  algorithm: string;
  keyId: string;
  size: number;
  lastRotated: string;
  status: "active" | "encrypting" | "rotating" | "error";
}

export function getVolumeEncryption(projectId: string): VolumeEncryption[] {
  return [
    { volumeId: "vol-1", projectId, encrypted: true, algorithm: "AES-256-XTS", keyId: "vk-1", size: 10737418240, lastRotated: new Date(Date.now() - 7 * 86400000).toISOString(), status: "active" },
    { volumeId: "vol-2", projectId, encrypted: true, algorithm: "AES-256-XTS", keyId: "vk-1", size: 5368709120, lastRotated: new Date(Date.now() - 7 * 86400000).toISOString(), status: "active" },
    { volumeId: "vol-3", projectId, encrypted: false, algorithm: "none", keyId: "", size: 1073741824, lastRotated: "", status: "active" },
  ];
}

export function encryptVolume(projectId: string, volumeId: string): VolumeEncryption {
  return { volumeId, projectId, encrypted: true, algorithm: "AES-256-XTS", keyId: "vk-new", size: 1073741824, lastRotated: new Date().toISOString(), status: "encrypting" };
}
