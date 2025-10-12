from backend.encryption_utils import *

DESCRIPTION = "Verificar que dois usuários conseguem descobrir a mesma shared key"

private_key_A = generate_private_key()
private_key_B = generate_private_key()

public_key_A = generate_public_key(private_key_A)
public_key_B = generate_public_key(private_key_B)

assert find_shared_key(private_key_A, public_key_B) == find_shared_key(private_key_B, public_key_A), \
    ""