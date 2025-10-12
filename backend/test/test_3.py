from backend.encryption_utils import *

DESCRIPTION = "Verify that two users can encrypt and decrypt a 3DES key through Salsa20"

key_3DES = generate_3des_key()

private_key_A = generate_private_key()
private_key_B = generate_private_key()

public_key_A = generate_public_key(private_key_A)
public_key_B = generate_public_key(private_key_B)

shared_key = generate_shared_key_from_df(private_key_A, public_key_B)

nonce, cipher_key = encrypt_3des_key(key_3DES, shared_key)

deciphered_key = decrypt_3des_key(nonce, cipher_key, shared_key)

assert key_3DES == deciphered_key, "3DES key wasn't equal to the deciphered key"

print("3DES key:" , key_3DES)
print("Deciphered key:", deciphered_key)
