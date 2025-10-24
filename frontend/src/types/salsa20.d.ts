declare module "salsa20" {
  export class Salsa20 {
    constructor(key: Uint8Array, nonce: Uint8Array);
    getBytes(length: number): Uint8Array;
    setKey(key: Uint8Array): void;
    setNonce(nonce: Uint8Array): void;
  }

  export default Salsa20;
}