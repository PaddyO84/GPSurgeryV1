import pytest
from playwright.sync_api import sync_playwright
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial

@pytest.fixture(scope="session")
def browser():
    """Launch a Playwright browser for the entire test session."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()

@pytest.fixture
def page(browser):
    """Provide a fresh page for each test.
    A new browser context is created per test to isolate storage (localStorage, cookies, etc.).
    """
    context = browser.new_context()
    page = context.new_page()
    yield page
    context.close()

# --- Server fixture for providing base_url ---
import pathlib
import os

@pytest.fixture(scope="session")
def base_url():
    # Serve files from the project root (where index.html resides)
    repo_root = pathlib.Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(repo_root))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{port}"
    yield base
    server.shutdown()
    thread.join()
