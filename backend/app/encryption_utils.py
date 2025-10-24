import random
from Crypto.Cipher import DES3, Salsa20
from Crypto.Random import get_random_bytes
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

# Base generator
G = 17

# bits (private key size)
BITS = 3072

# Modulus for 3072 bits (prime)
p = 4412528943149083678979192193449744489563969625596521758839529242168592399690415919769897007277046467119896088420176776309098549062338453995786146624848214853930943148751820331387986814894724831689634695126717495548396747829017472519035389679794734844214072143839217393060277519468897958066691252950054167169720234985654610362908427095446173511078324134089055829544442622968071836783562414908140160461812386164230831417518267215492802246306804042136557463121624437902737208182727552367244902655804274382767778070785074157917945251185677578531614838713614141147225871522643271039619439898845519435576957877111879999418273771142792530358769566521850899691714708920168553336965177278420004011574685756161039127162752188431619045197313709002837063584742344577115418463312760263097816597738278214427680876927122917414963716031229408035794443126149753231853306843489092496048505105698482372835578035471074034132286729327863599138103

# df key length IN BYTES
DF_KEY_LENGTH = 16

def generate_3des_key():
    while True:
        try:
            key = DES3.adjust_key_parity(get_random_bytes(24)) # each key is 8 bytes long
            break
        except ValueError:
            pass

    return key


def encrypt_message_with_3des(msg, key):
    cipher = DES3.new(key, DES3.MODE_EAX)
    nonce = cipher.nonce
    ciphertext = cipher.encrypt(msg.encode("ascii"))
    return nonce, ciphertext


def decrypt_with_3des(nonce, ciphertext, key):
    cipher = DES3.new(key, DES3.MODE_EAX, nonce=nonce)
    plaintext = cipher.decrypt(ciphertext)
    return plaintext.decode("ascii")


# diffie hellman
def generate_private_key():
    return random.getrandbits(BITS)


def generate_public_key(priv_key):
    return pow(G, priv_key, p)


def find_shared_secret(priv_key_a, pub_key_b):
    return pow(pub_key_b, priv_key_a, p)


def generate_shared_key_from_df(priv_key_a, pub_key_b):
    """Uses HKDF to derive a key (of length defined by DF_KEY_LENGTH in encryption_utils) from DF shared secret"""
    secret = find_shared_secret(priv_key_a, pub_key_b)

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=DF_KEY_LENGTH,
    )

    key = hkdf.derive(secret.to_bytes(384, "big"))

    return key


def encrypt_3des_key(key_3des, key_salsa20):
    """Uses the key we generated from DF in Salsa20 to encrypt 3DES key"""
    cipher = Salsa20.new(key=key_salsa20)
    nonce = cipher.nonce
    encrypted_key = cipher.encrypt(key_3des)
    return nonce, encrypted_key


def decrypt_3des_key(nonce, encrypted_key, key_salsa20):
    """Uses the key we generated from DF in Salsa20 to decrypt 3DES key"""
    cipher = Salsa20.new(key=key_salsa20, nonce=nonce)
    key_3des = cipher.decrypt(encrypted_key)
    return key_3des
