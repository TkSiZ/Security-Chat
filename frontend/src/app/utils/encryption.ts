// encryption-utils.ts
import CryptoJS from "crypto-js";

export function generate3DESKey(): string {
  const array = new Uint8Array(24);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function encrypt3DES(msg: string, keyHex: string) {
  const key = CryptoJS.enc.Hex.parse(keyHex);

  const ivBytes = new Uint8Array(8);
  window.crypto.getRandomValues(ivBytes);
  const iv = CryptoJS.enc.Hex.parse(
    Array.from(ivBytes).map(b => b.toString(16).padStart(2, "0")).join("")
  );

  const encrypted = CryptoJS.TripleDES.encrypt(msg, key, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    iv
  });

  return iv.toString() + ":" + encrypted.toString();
}

export function decrypt3DES(data: string, keyHex: string) {
  const [ivHex, ciphertext] = data.split(":");
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const decrypted = CryptoJS.TripleDES.decrypt(ciphertext, key, {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
    iv
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

