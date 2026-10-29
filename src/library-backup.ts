import { parseLibrary, type LibraryData } from "./library-data";
const FORMAT = "folio-encrypted-library";
const ITERATIONS = 600000;
const aad = new TextEncoder().encode(FORMAT + ":1");
function base64(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
function bytes(text: string) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}
async function key(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptLibrary(value: unknown, password: string) {
  if (password.length < 12)
    throw new Error("Use at least 12 characters for your backup password.");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    await key(password, salt),
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return JSON.stringify({
    format: FORMAT,
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: base64(salt),
    iv: base64(iv),
    ciphertext: base64(new Uint8Array(encrypted)),
  });
}
export async function decodeLibrary(
  text: string,
  password: string,
): Promise<LibraryData> {
  if (new Blob([text]).size > 10_000_000)
    throw new Error("Backup exceeds the 10 MB restore limit.");
  const envelope = JSON.parse(text);
  if (envelope?.format !== FORMAT) return parseLibrary(envelope);
  if (!password)
    throw new Error(
      "Enter the backup password before restoring this encrypted file.",
    );
  try {
    if (
      envelope.version !== 1 ||
      envelope.kdf !== "PBKDF2-SHA256" ||
      envelope.iterations !== ITERATIONS ||
      typeof envelope.salt !== "string" ||
      typeof envelope.iv !== "string" ||
      typeof envelope.ciphertext !== "string"
    )
      throw new Error();
    const salt = bytes(envelope.salt),
      iv = bytes(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: aad },
      await key(password, salt),
      bytes(envelope.ciphertext),
    );
    return parseLibrary(JSON.parse(new TextDecoder().decode(plain)));
  } catch {
    throw new Error(
      "Could not unlock this backup. Check the password and that the file has not been changed. Your library is unchanged.",
    );
  }
}
