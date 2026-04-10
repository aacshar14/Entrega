from cryptography.fernet import Fernet
from app.core.config import settings
import base64

# Use SUPABASE_JWT_SECRET or a dedicated ENCRYPTION_KEY to derive the key
# For production hardening, we slice/pad to ensure 32-byte key for Fernet
_key_source = settings.SUPABASE_JWT_SECRET or "entrega-v1-fallback-secret-key-32chars!"
_key_bytes = _key_source.encode()
_key = base64.urlsafe_b64encode(_key_bytes[:32].ljust(32, b"0"))
fernet = Fernet(_key)


def encrypt_token(token: str) -> str:
    """Encrypt a plain text token using AES-256 (Fernet)."""
    if not token:
        return None
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt an encrypted token back to plain text."""
    if not encrypted_token:
        return None
    try:
        return fernet.decrypt(encrypted_token.encode()).decode()
    except Exception:
        # Log error in production check, but don't leak key info
        return None
