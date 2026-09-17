from playwright.sync_api import sync_playwright, Page, expect
from pathlib import Path
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

def start_local_server(directory):
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port

def verify_hero_logo(page: Page, index_url: str):
    print(f"Verifying Hero Logo at: {index_url}")

    # Set viewport to Desktop size
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(index_url, wait_until="networkidle")

    # Close welcome modal if it appears (it should, as we cleared storage implicitly or strictly)
    if page.is_visible("#demo-welcome-modal"):
        page.click("button:has-text('I Understand')")

    # Check if logo exists and is visible
    logo = page.locator(".hero-logo")
    expect(logo).to_be_visible()

    # Validate the image has fully loaded (naturalWidth > 0 means the resource was fetched).
    page.wait_for_function("el => el.complete && el.naturalWidth > 0", arg=logo.element_handle())
    natural_width = logo.evaluate("el => el.naturalWidth")
    assert natural_width and natural_width > 0, "Hero logo image has not finished loading (naturalWidth is 0)"

    # Check dimensions
    box = logo.bounding_box()
    print(f"Desktop Logo Dimensions: {box}")
    assert box is not None, "Desktop logo bounding box should not be None"
    assert box["width"] > 0 and box["height"] > 0, "Desktop logo should have non-zero dimensions"
    assert box["width"] <= 450, f"Desktop logo width {box['width']} exceeds max-width 450px"

    # Take screenshot
    page.screenshot(path="verification/hero_logo_desktop.png")

    # Test Mobile View
    page.set_viewport_size({"width": 375, "height": 667})

    # Close welcome modal if it appears again (unlikely in same session but good practice)
    if page.is_visible("#demo-welcome-modal"):
        page.click("button:has-text('I Understand')")

    logo_mobile = page.locator(".hero-logo")
    expect(logo_mobile).to_be_visible()

    box_mobile = logo_mobile.bounding_box()
    print(f"Mobile Logo Dimensions: {box_mobile}")
    assert box_mobile is not None, "Mobile logo bounding box should not be None"
    assert box_mobile["width"] > 0 and box_mobile["height"] > 0, "Mobile logo should have non-zero dimensions"
    assert box_mobile["width"] <= 375, f"Mobile logo width {box_mobile['width']} exceeds viewport width 375px"
    assert box_mobile["x"] >= 0, f"Mobile logo left offset {box_mobile['x']} is negative"
    assert box_mobile["x"] + box_mobile["width"] <= 375, f"Mobile logo right edge {box_mobile['x'] + box_mobile['width']} exceeds viewport width 375px"

    page.screenshot(path="verification/hero_logo_mobile.png")
    print("Verification complete.")

if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    server, port = start_local_server(repo_root)
    index_url = f"http://127.0.0.1:{port}/index.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                verify_hero_logo(page, index_url)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
