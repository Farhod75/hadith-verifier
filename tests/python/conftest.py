# tests/python/conftest.py
# pytest configuration for Hadith Verifier API tests

import pytest
import os

def pytest_configure(config):
    """Print BASE_URL being tested against."""
    # P129: default was 3000, where nothing has ever run. HV's dev server is
    # 3001 (package.json) and the mocked server the hook starts is 3011. The
    # whole 68-test suite failed on connection refused, on every machine, since
    # it was written.
    base_url = os.getenv("BASE_URL", "http://localhost:3011")
    print(f"\nTesting against: {base_url}\n")
