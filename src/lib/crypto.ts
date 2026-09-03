import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function key(): Buffer | null {
  const raw = process.env.GOOGLE_TOKEN_ENC_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
}

/**
 * Chiffre un secret (AES-256-GCM) si `GOOGLE_TOKEN_ENC_KEY` est défini.
 * Sinon, stocke en clair avec un préfixe explicite.
 */
export function encryptSecret(plain: string): string {
  const k = key();
  if (!k) return `raw:${plain}`;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (stored.startsWith("raw:")) return stored.slice(4);
  if (!stored.startsWith("gcm:")) return stored; // ancien format en clair

  const k = key();
  if (!k) throw new Error("GOOGLE_TOKEN_ENC_KEY manquant pour déchiffrer.");

  const [, ivB, tagB, dataB] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
