from app.encryption_utils import *

DESCRIPTION = "Verify that two users can encrypt and decrypt a 3DES key through Salsa20, then verify the decrypted key works"

key_3DES = generate_3des_key()

private_key_A = generate_private_key()
private_key_B = generate_private_key()

public_key_A = generate_public_key(private_key_A)
public_key_B = generate_public_key(private_key_B)

shared_key_A = generate_shared_key_from_df(private_key_A, public_key_B)
shared_key_B = generate_shared_key_from_df(private_key_B, public_key_A)

assert shared_key_A == shared_key_B, "Shared key was different for both users"

shared_key = shared_key_A

nonce, cipher_key = encrypt_3des_key(key_3DES, shared_key)

deciphered_key = decrypt_3des_key(nonce, cipher_key, shared_key)

assert key_3DES == deciphered_key, "3DES key wasn't equal to the deciphered key"

print("3DES key:" , key_3DES)
print("Deciphered key:", deciphered_key)
print("Encrypted key:", cipher_key)

assert cipher_key == cipher_key.decode("latin-1").encode("latin-1"), "Cipher key wasn't maintained after decoding and encoding"

MESSAGE = "oi"

nonce, ciphertext = encrypt_message_with_3des(MESSAGE, key_3DES)
deciphered_text = decrypt_with_3des(nonce, ciphertext, deciphered_key)

assert deciphered_text == MESSAGE, f"Deciphered text '{deciphered_text}' was different than the MESSAGE {MESSAGE}"

print(f"Original message: '{MESSAGE}'\nDeciphered message: '{deciphered_text}'")
print(f"3DES Key: '{deciphered_key}'")