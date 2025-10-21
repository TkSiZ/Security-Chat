import * as CryptoUtils from "./encryption";

// Example usage of all functions
async function main() {
  console.log("===== 3DES KEY GENERATION =====");
  const key3DES = CryptoUtils.generate3DESKey();
  console.log("Generated 3DES key (hex):", key3DES);

  console.log("\n===== 3DES ENCRYPT/DECRYPT MESSAGE =====");
  const message = "Hello, this is a secret message!";
  const encryptedMessage = CryptoUtils.encryptMessageWith3DES(message, key3DES);
  console.log("Encrypted message:", encryptedMessage);

  const decryptedMessage = CryptoUtils.decryptWith3DES(encryptedMessage, key3DES);
  console.log("Decrypted message:", decryptedMessage);

  console.log("\n===== DIFFIE-HELLMAN KEYS =====");
  const privKeyA = CryptoUtils.generatePrivateKey();
  const privKeyB = CryptoUtils.generatePrivateKey();
  console.log("Private key A:", privKeyA.toString(16));
  console.log("Private key B:", privKeyB.toString(16));

  const pubKeyA = CryptoUtils.generatePublicKey(privKeyA);
  const pubKeyB = CryptoUtils.generatePublicKey(privKeyB);
  console.log("Public key A:", pubKeyA.toString(16));
  console.log("Public key B:", pubKeyB.toString(16));

  console.log("\n===== SHARED SECRET =====");
  const sharedSecretA = CryptoUtils.findSharedSecret(privKeyA, pubKeyB);
  const sharedSecretB = CryptoUtils.findSharedSecret(privKeyB, pubKeyA);
  console.log("Shared secret (A):", sharedSecretA.toString(16));
  console.log("Shared secret (B):", sharedSecretB.toString(16));
  console.log("Secrets match:", sharedSecretA === sharedSecretB);

  console.log("\n===== SHARED KEY FOR SYMMETRIC CIPHER =====");
  const sharedKey = CryptoUtils.generateSharedKeyFromDF(privKeyA, pubKeyB);
  console.log("Shared key (first 16 bytes):", Buffer.from(sharedKey).toString("hex"));

  console.log("\n===== SALSA20 ENCRYPT/DECRYPT 3DES KEY =====");
  const key3DESBytes = new Uint8Array(key3DES.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const { nonce, encryptedKey } = CryptoUtils.encrypt3DESKey(key3DESBytes, sharedKey);
  console.log("Nonce:", Buffer.from(nonce).toString("hex"));
  console.log("Encrypted 3DES key:", Buffer.from(encryptedKey).toString("hex"));

  const decryptedKey = CryptoUtils.decrypt3DESKey(nonce, encryptedKey, sharedKey);
  console.log("Decrypted 3DES key matches:", Buffer.from(decryptedKey).toString("hex") === key3DES);
}

main().catch(console.error);
