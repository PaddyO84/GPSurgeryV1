from playwright.sync_api import sync_playwright, Page, expect, Error
from pathlib import Path
import os

def test_forms_wiring(page: Page, base_url: str):
    # Configure mock endpoint for wiring tests
    page.add_init_script("""
        localStorage.setItem('demo_welcome_seen', 'true');
        window.IS_LIVE = true;
        if (typeof CONFIG !== 'undefined') {
            CONFIG.SCRIPT_WEB_APP_URL = CONFIG.SCRIPT_WEB_APP_URL || 'https://script.google.com/macros/s/TEST_DEPLOYMENT/exec';
        } else {
            window.CONFIG = { SCRIPT_WEB_APP_URL: 'https://script.google.com/macros/s/TEST_DEPLOYMENT/exec' };
        }
    """)
    verify_forms_wiring(page, base_url=base_url)

def verify_forms_wiring(page: Page, base_url: str = None):
    # Get base_url or serve via provided base_url
    if base_url:
        prescription_url = f"{base_url}/order-prescription.html"
        sick_note_url = f"{base_url}/sick-notes.html"
    else:
        repo_root = Path(__file__).resolve().parent.parent
        prescription_url = (repo_root / "order-prescription.html").as_uri()
        sick_note_url = (repo_root / "sick-notes.html").as_uri()

    print(f"Testing Prescription Form at: {prescription_url}")

    # 1. Test Prescription Form
    page.goto(prescription_url, wait_until="networkidle")

    # Read configured script web app URL from the page
    script_web_app_url = page.evaluate("() => typeof CONFIG !== 'undefined' ? CONFIG.SCRIPT_WEB_APP_URL : (window.CONFIG ? window.CONFIG.SCRIPT_WEB_APP_URL : null)")
    assert script_web_app_url, "CONFIG.SCRIPT_WEB_APP_URL must be defined"

    # Handle Welcome Modal if it appears
    if page.is_visible("#demo-welcome-modal"):
        page.click("button:has-text('I Understand')")
        expect(page.locator("#demo-welcome-modal")).not_to_be_visible()

    # Fill form
    page.fill("#patientName", "John Doe")
    page.fill("#patientEmail", "john@example.com")
    page.fill("#patientPhone", "0871234567")
    page.fill("#patientDOB", "1980-01-01")
    page.fill("#patientAddress", "123 Main St")

    # Wait for the select to be populated (hacky workaround for potential race condition)
    # If the options are not there, try to proceed anyway to see if it works or fails
    try:
        page.select_option("#chosenPharmacy", index=1) # Select first option
    except Error:
        print("Initial select failed, trying to wait for options...")
        page.wait_for_function("document.getElementById('chosenPharmacy').options.length > 1", timeout=5000)
        page.select_option("#chosenPharmacy", index=1)

    # Add Med
    page.fill("#medName", "Test Med")
    page.fill("#medDosage", "10mg")
    page.select_option("#medFreq", "Once a day")
    page.click("button.add-med-btn")

    # Submit
    page.click("button.submit-btn") # Opens modal

    # Wait for modal
    page.wait_for_selector("#summaryModal", state="visible")

    # Set up request interception for prescription submit
    def handle_rx_route(route):
        req = route.request
        if req.url == script_web_app_url and req.method == "POST":
            route.fulfill(
                status=200,
                content_type="application/json",
                body='{"result": "success", "row": 2}'
            )
        else:
            route.continue_()

    page.route("**/*", handle_rx_route)

    with page.expect_request(lambda req: req.url == script_web_app_url and req.method == "POST") as rx_req_info:
        page.click("button.btn-confirm")

    request = rx_req_info.value
    print("Prescription Request URL:", request.url)
    post_data = request.post_data_json
    print("Prescription Payload:", post_data)

    assert request.url == script_web_app_url
    assert post_data["formType"] == "prescription"
    assert post_data["patientDetails"]["name"] == "John Doe"
    assert len(post_data["medicationList"]) == 1

    page.screenshot(path="verification/prescription_success.png")
    print("Prescription verification successful.")

    # Unroute before navigating to sick note
    page.unroute("**/*")

    # 2. Test Sick Note Form
    print(f"Testing Sick Note Form at: {sick_note_url}")
    page.goto(sick_note_url, wait_until="networkidle")

    # Handle Welcome Modal if it appears
    if page.is_visible("#demo-welcome-modal"):
        page.click("button:has-text('I Understand')")
        expect(page.locator("#demo-welcome-modal")).not_to_be_visible()

    # Fill form
    page.fill("#firstName", "Jane")
    page.fill("#lastName", "Doe")
    page.fill("#dob", "1990-01-01")
    page.fill("#phone", "0879876543")
    page.fill("#email", "jane@example.com")
    page.fill("#address", "456 High St")

    # Radios
    page.check('input[name="certType"][value="Private"]')

    page.fill("#condition", "Flu")
    page.fill("#startDate", "2023-10-25")
    page.fill("#endDate", "2023-10-27")

    page.check('input[name="returnToWork"][value="No"]')

    # Signature (Canvas) - Bypass flaky mouse simulation with direct JS execution
    page.evaluate("""() => {
        const canvas = document.getElementById('signatureCanvas');
        const ctx = canvas.getContext('2d');
        ctx.moveTo(10, 10);
        ctx.lineTo(100, 100);
        ctx.stroke();

        // Manually set the flag and hidden input value as if a signature was drawn
        window.hasSigned = true;
        document.getElementById('signatureData').value = canvas.toDataURL();
    }""")

    page.check("#declaration")

    # Submit
    page.click("button.submit-btn") # Opens modal
    page.wait_for_selector("#summaryModal", state="visible")

    # Read configured script web app URL from the sick note page
    script_web_app_url_sick = page.evaluate("() => typeof CONFIG !== 'undefined' ? CONFIG.SCRIPT_WEB_APP_URL : (window.CONFIG ? window.CONFIG.SCRIPT_WEB_APP_URL : null)")
    assert script_web_app_url_sick, "CONFIG.SCRIPT_WEB_APP_URL must be defined on sick note page"

    # Set up request interception for sick note submit
    def handle_sick_route(route):
        req = route.request
        if req.url == script_web_app_url_sick and req.method == "POST":
            route.fulfill(
                status=200,
                content_type="application/json",
                body='{"result": "success", "type": "sick-note"}'
            )
        else:
            route.continue_()

    page.route("**/*", handle_sick_route)

    with page.expect_request(lambda req: req.url == script_web_app_url_sick and req.method == "POST") as sick_req_info:
        page.click("button.btn-confirm")

    request_sick = sick_req_info.value
    print("Sick Note Request URL:", request_sick.url)
    post_data_sick = request_sick.post_data_json
    print("Sick Note Payload:", post_data_sick)

    assert request_sick.url == script_web_app_url_sick
    assert post_data_sick["formType"] == "sick-note"
    assert post_data_sick["name"] == "Jane Doe"
    assert post_data_sick["condition"] == "Flu"
    assert "data:image/png;base64" in post_data_sick["signature"]

    page.screenshot(path="verification/sicknote_success.png")
    print("Sick Note verification successful.")

if __name__ == "__main__":
    try:
        from verification.server_helper import start_local_server
    except ImportError:
        from server_helper import start_local_server

    repo_root = Path(__file__).resolve().parent.parent
    server, port = start_local_server(str(repo_root))
    base_url = f"http://127.0.0.1:{port}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_forms_wiring(page, base_url=base_url)
        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise e
        finally:
            browser.close()
            server.shutdown()
