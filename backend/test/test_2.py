from backend.app.encryption_utils import *

DESCRIPTION = "Verify that two users reach the same shared key through diffie hellman"

private_key_A = generate_private_key()
private_key_B = generate_private_key()

public_key_A = generate_public_key(private_key_A)
public_key_B = generate_public_key(private_key_B)

assert (sK := find_shared_secret(private_key_A, public_key_B)) == find_shared_secret(private_key_B, public_key_A), \
    "Could not reach the same shared secret"

shared_key_A = generate_shared_key_from_df(private_key_A, public_key_B)
shared_key_B = generate_shared_key_from_df(private_key_B, public_key_A)

assert shared_key_A == shared_key_B, "Reached shared secret, but produced different keys"

print(f"Public key A (bits): {public_key_A}\nLength in bytes: {len(b'public_key_A')}. String length: {len(str(public_key_A))}")
print(f"Private key A: {private_key_A}\nLength in bytes: {len(b'private_key_A')}")
print(f"Public key B: {public_key_B}\nLength in bytes: {len(b'public_key_B')}. String length: {len(str(public_key_B))}")
print(f"Private key B: {private_key_B}\nLength in bytes: {len(b'private_key_B')}")
print(f"Shared secret: {sK}\nLength in bytes: {len(b'sK')}")
print(f"Shared key: {shared_key_A}\nLength in bytes: {len(shared_key_A)}")
