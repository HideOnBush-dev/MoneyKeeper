#!/usr/bin/env python3
"""
Generate a secure SECRET_KEY for Flask application
"""

import secrets

def generate_secret_key():
    """Generate a cryptographically secure secret key"""
    return secrets.token_hex(32)

if __name__ == "__main__":
    key = generate_secret_key()
    print("Generated SECRET_KEY:")
    print(key)
    print("\nAdd this to your .env or environment:")
    print(f"SECRET_KEY={key}")


