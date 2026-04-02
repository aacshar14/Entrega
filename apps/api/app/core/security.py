from cryptography.fernet import Fernet
import base64
import hashlib
from app.core.config import settings

def get_cipher():
    # Derive a 32-byte key from settings.SECRET_KEY
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key)
    return Fernet(fernet_key)

def encrypt_token(token: str) -> str:
    if not token:
        return ""
    cipher = get_cipher()
    return cipher.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return ""
    cipher = get_cipher()
    return cipher.decrypt(encrypted_token.encode()).decode()
