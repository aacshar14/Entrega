import os

paths = [
    'apps/api/app/api/v1/endpoints/users.py',
    'apps/api/app/models/models.py'
]

for p in paths:
    if os.path.exists(p):
        print(f"Normalizing {p}...")
        # 1. Read binary
        with open(p, 'rb') as f:
            content = f.read()
        
        # 2. Convert CRLF to LF
        new_content = content.replace(b'\r\n', b'\n')
        
        # 3. Write back binary
        with open(p, 'wb') as f:
            f.write(new_content)
        
        print(f"Done. Final size: {os.path.getsize(p)} bytes")
