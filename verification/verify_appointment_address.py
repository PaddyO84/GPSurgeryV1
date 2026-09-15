import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json

def verify_address_submission(page, base_url: str = None):
    if base_url:
        appointments_url = f"{base_url}/appointments.html"
    else:
        repo_root = Path(__file__).resolve().parent.parent
        appointments_url = (repo_root / "appointments.html").as_uri()

    page.goto(appointments_url, wait_until="networkidle")

    # Handle Welcome Modal if present
    try:
        # Force remove the modal from DOM to be sure
        page.evaluate("document.getElementById('demo-welcome-modal')?.remove()")
        print("Removed welcome modal.")
    except Exception as e:
        print(f"Error removing modal: {e}")

    # Fill out the form
    page.fill("#appName", "Test Patient")
    page.fill("#appDob", "1990-01-01")
    page.fill("#appPhone", "0871234567")
    page.fill("#appEmail", "test@example.com")
    page.fill("#appAddress", "123 Test Street, Test Town")
    page.select_option("#appType", "Routine GP Visit")
    page.select_option("#appTime", "Morning (9am - 12pm)")
    page.fill("#appNotes", "This is a test note.")

    # Intercept the request to verify payload
    def handle_route(route):
        if "exec" in route.request.url and route.request.method == "POST":
            post_data = route.request.post_data
            try:
                data = json.loads(post_data)
                print(f"Intercepted Payload: {json.dumps(data, indent=2)}")

                if "address" in data and data["address"] == "123 Test Street, Test Town":
                    print("SUCCESS: Address field correctly found in payload.")
                    route.fulfill(status=200, body=json.dumps({"result": "success"}))
                else:
                    print("FAILURE: Address field missing or incorrect in payload.")
                    route.abort()
            except Exception as e:
                print(f"Error parsing JSON: {e}")
                route.abort()
        else:
            route.continue_()

    # Route interception
    page.route("**/*", handle_route)

    # Click Submit
    page.click("button[type='submit']")

    # Wait for success message
    expect(page.locator("#appSuccessMessage")).to_be_visible(timeout=5000)

    # Take screenshot
    page.screenshot(path="verification/appointment_address_verified.png")

if __name__ == "__main__":
    from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
    from functools import partial
    import threading

    repo_root = Path(__file__).resolve().parent.parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(repo_root))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    port = server.server_address[1]
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    base_url = f"http://127.0.0.1:{port}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_address_submission(page, base_url=base_url)
        except Exception as e:
            print(f"Test failed: {e}")
            raise
        finally:
            browser.close()
            server.shutdown()
            server_thread.join()
