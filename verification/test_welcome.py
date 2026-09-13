import os
import socket
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, Page, expect

def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def start_local_server(directory):
    port = get_free_port()
    handler = partial(SimpleHTTPRequestHandler, directory=directory)
    server = ThreadingHTTPServer(('127.0.0.1', port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port

def test_welcome_modal(page: Page, base_url: str):
    index_url = f"{base_url}/index.html"
    contact_url = f"{base_url}/contact.html"

    print(f"Testing Welcome Modal at: {index_url}")

    # 1. First Visit: Modal should appear
    page.goto(index_url)

    # Wait for modal
    modal = page.locator("#demo-welcome-modal")
    expect(modal).to_be_visible()

    # Check text
    expect(modal).to_contain_text("Welcome to the Demo Site")
    expect(modal).to_contain_text("NOT LIVE")

    print("Modal appeared on first visit.")
    page.screenshot(path="verification/welcome_modal_visible.png")

    # 2. Close Modal
    page.click("button:has-text('I Understand')")
    expect(modal).not_to_be_visible()
    print("Modal closed.")

    # 3. Reload: Modal should NOT appear
    page.reload()
    expect(modal).not_to_be_visible()
    print("Modal did not appear on reload.")

    # 4. Visit another page: Modal should NOT appear (shared local storage across same origin)
    page.goto(contact_url)
    expect(modal).not_to_be_visible()
    print("Modal did not appear on second page.")

if __name__ == "__main__":
    server, port = start_local_server(os.getcwd())
    base_url = f"http://127.0.0.1:{port}"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context to simulate a fresh session/storage
        context = browser.new_context()
        page = context.new_page()
        try:
            test_welcome_modal(page, base_url)
        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/welcome_failure.png")
            raise e
        finally:
            browser.close()
            server.shutdown()
