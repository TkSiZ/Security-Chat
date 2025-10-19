// encryption-utils.ts
import CryptoJS from "crypto-js";
import { Salsa20 } from "salsa20";

// Base generator
const G = 17n;

// bits (private key size)
const BITS = 3072;

// Modulus for 3072 bits (prime)
const P = BigInt(
  "4412528943149083678979192193449744489563969625596521758839529242168592399690415919769897007277046467119896088420176776309098549062338453995786146624848214853930943148751820331387986814894724831689634695126717495548396747829017472519035389679794734844214072143839217393060277519468897958066691252950054167169720234985654610362908427095446173511078324134089055829544442622968071836783562414908140160461812386164230831417518267215492802246306804042136557463121624437902737208182727552367244902655804274382767778070785074157917945251185677578531614838713614141147225871522643271039619439898845519435576957877111879999418273771142792530358769566521850899691714708920168553336965177278420004011574685756161039127162752188431619045197313709002837063584742344577115418463312760263097816597738278214427680876927122917414963716031229408035794443126149753231853306843489092496048505105698482372835578035471074034132286729327863599138103"
);

// df key length IN BYTES
const DF_KEY_LENGTH = 16;

export function generate3DESKey(): string {
  let key: string;
  do {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    key = Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
  } while (key.length !== 48);
  return key;
}

export function encryptMessageWith3DES(msg: string, key: string): string {
  return CryptoJS.TripleDES.encrypt(
    msg,
    CryptoJS.enc.Hex.parse(key),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
  ).toString();
}

export function decryptWith3DES(ciphertext: string, key: string): string {
  const bytes = CryptoJS.TripleDES.decrypt(
    ciphertext,
    CryptoJS.enc.Hex.parse(key),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
  );
  return bytes.toString(CryptoJS.enc.Utf8);
}

// -------------------------------------------
// Diffie-Hellman
// -------------------------------------------

export function generatePrivateKey(): bigint {
  const bytes = new Uint8Array(BITS / 8);
  crypto.getRandomValues(bytes);
  let hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return BigInt("0x" + hex);
}

export function generatePublicKey(privKey: bigint): bigint {
  return modPow(G, privKey, P);
}

export function findSharedSecret(privKeyA: bigint, pubKeyB: bigint): bigint {
  return modPow(pubKeyB, privKeyA, P);
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

export function generateSharedKeyFromDF(privKeyA: bigint, pubKeyB: bigint): Uint8Array {
  const secret = findSharedSecret(privKeyA, pubKeyB);
  const secretHex = secret.toString(16);
  const secretBytes = hexToBytes(secretHex);

  return new Uint8Array(secretBytes.slice(0, DF_KEY_LENGTH));
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2) hex = "0" + hex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// -------------------------------------------
// Salsa20 encryption for 3DES key
// -------------------------------------------

export function encrypt3DESKey(key3DES: Uint8Array, keySalsa20: Uint8Array) {
  const nonce = crypto.getRandomValues(new Uint8Array(8));
  const salsa = new Salsa20(keySalsa20, nonce);

  const encryptedKey = new Uint8Array(key3DES.length);
  const stream = salsa.getBytes(key3DES.length);

  for (let i = 0; i < key3DES.length; i++) {
    encryptedKey[i] = key3DES[i] ^ stream[i];
  }

  return { nonce, encryptedKey };
}

export function decrypt3DESKey(nonce: Uint8Array, encryptedKey: Uint8Array, keySalsa20: Uint8Array) {
  const salsa = new Salsa20(keySalsa20, nonce);

  const decryptedKey = new Uint8Array(encryptedKey.length);
  const stream = salsa.getBytes(encryptedKey.length);

  for (let i = 0; i < encryptedKey.length; i++) {
    decryptedKey[i] = encryptedKey[i] ^ stream[i];
  }

  return decryptedKey;
}
