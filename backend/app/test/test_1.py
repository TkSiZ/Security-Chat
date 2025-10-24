from app.encryption_utils import *

DESCRIPTION = "Cipher and decipher a message using 3DES"

MESSAGE = "Bom dia filho. Posso revistar a sua casa?"

key = generate_3des_key()
nonce, ciphertext = encrypt_message_with_3des(MESSAGE, key)
deciphered_text = decrypt_with_3des(nonce, ciphertext, key)

assert deciphered_text == MESSAGE, f"Deciphered text '{deciphered_text}' was different than the MESSAGE {MESSAGE}"

print(f"Original message: '{MESSAGE}'\nDeciphered message: '{deciphered_text}'")
print(f"3DES Key: '{key}'\nNonce: {nonce}")
