import crypto from "crypto";

// M-5: Encrypt secrets (LLM API keys) at rest with AES-256-GCM.
// The key is derived from SESSION_SECRET so no additional env var is required.
// NOTE: rotating SESSION_SECRET makes previously-encrypted secrets undecryptable
// (users would need to re-enter their API keys) — this is intentional.
function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET || (process.env.NEXT_PHASE === "phase-production-build" ? "build_fallback_secret_32bytes_hex" : undefined);
  if (!secret) {
    throw new Error("[FATAL] SESSION_SECRET is not set — required for secret encryption.");
  }
  return crypto.createHash("sha256").update(`strix-enc-v1:${secret}`).digest(); // 32 bytes
}

const PREFIX = "enc:v1:";

export function encryptSecret(plaintext: string): string {
  const KEY = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  // Legacy plaintext fallback: values written before encryption was introduced.
  if (!stored.startsWith(PREFIX)) return stored;
  const KEY = getKey();
  const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
