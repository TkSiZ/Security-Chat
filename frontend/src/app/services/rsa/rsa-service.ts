import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RsaService {
  async generateRSAKeyPair() {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async exportPublicKey(key: CryptoKey) {
    const exported = await crypto.subtle.exportKey("spki", key);
    const exportedAsString = this.arrayBufferToString(exported);
    const b64 = btoa(exportedAsString);
    return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
  }

  async exportPrivateKey(key: CryptoKey) {
    const exported = await crypto.subtle.exportKey("pkcs8", key);
    const exportedAsString = this.arrayBufferToString(exported);
    const b64 = btoa(exportedAsString);
    return `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----`;
  }

  async encryptMessage(publicKey: CryptoKey, message: string) {
    const encoded = new TextEncoder().encode(message);
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      encoded
    );
    return btoa(this.arrayBufferToString(encrypted));
  }

  async decryptMessage(privateKey: CryptoKey, encryptedBase64: string) {
    const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedBytes
    );
    return new TextDecoder().decode(decrypted);
  }

async importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

async importPublicKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\n/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}


  // Helper
  private arrayBufferToString(buffer: ArrayBuffer): string {
    return String.fromCharCode(...new Uint8Array(buffer));
  }
}
