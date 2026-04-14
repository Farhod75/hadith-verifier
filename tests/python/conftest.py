# tests/python/conftest.py
# pytest configuration for Hadith Verifier API tests

import pytest
import os

def pytest_configure(config):
    """Print BASE_URL being tested against."""
    base_url = os.getenv("BASE_URL", "http://localhost:3000")
    print(f"\nTesting against: {base_url}\n")
