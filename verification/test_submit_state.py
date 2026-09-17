import pytest
from playwright.sync_api import Page, expect

def test_submit_state(page: Page, base_url: str):
    # Deterministically dismiss welcome modal before navigation
    page.add_init_script("localStorage.setItem('demo_welcome_seen', 'true'); window.IS_LIVE = true;")

    page.set_viewport_size({'width': 1280, 'height': 850})
    page.goto(f'{base_url}/order-prescription.html')
    page.wait_for_load_state('networkidle')

    welcome_btn = page.locator("#demo-welcome-modal button:has-text('I Understand')")
    if welcome_btn.is_visible():
        welcome_btn.click()
        page.wait_for_timeout(300)

    # Fill form fields
    page.fill("#patientName", "Jane Doe")
    page.fill("#patientEmail", "jane@example.com")
    page.fill("#patientPhone", "0871234567")
    page.fill("#patientDOB", "1985-05-15")
    page.fill("#patientAddress", "456 Main Street")
    page.wait_for_function("document.getElementById('chosenPharmacy').options.length > 1", timeout=5000)
    page.select_option("#chosenPharmacy", index=1)

    # Add a medication
    page.fill("#medName", "Paracetamol")
    page.fill("#medDosage", "500mg")
    page.select_option("#medFreq", "As needed")
    page.click("button.add-med-btn")

    # Intercept submission request
    script_web_app_url = page.evaluate("() => typeof CONFIG !== 'undefined' ? CONFIG.SCRIPT_WEB_APP_URL : (window.CONFIG ? window.CONFIG.SCRIPT_WEB_APP_URL : null)")
    assert script_web_app_url, "CONFIG.SCRIPT_WEB_APP_URL is not configured on the page"
    def handle_submit_route(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body='{"result": "success", "row": 2}'
        )
    page.route(script_web_app_url, handle_submit_route)

    # Click Review & Submit
    page.click(".submit-btn")
    expect(page.locator("#summaryModal")).to_be_visible()

    # Confirm & Submit in modal
    page.click("#summaryModal .btn-confirm")
    expect(page.locator("#successMessage")).to_be_visible()
    expect(page.locator("#prescriptionForm")).not_to_be_visible()

    box = page.locator('.form-app-container').bounding_box()
    assert box is not None
    assert page.locator('.sidebar').is_visible()
    assert page.locator('#btnClearForm').is_enabled()
    assert page.locator('#btnSaveFile').is_disabled()
    assert page.locator('#btnLoadFile').is_disabled()
    assert page.locator('#btnPrintSummary').is_disabled()

    page.screenshot(path='verification/success_state_current.png')

