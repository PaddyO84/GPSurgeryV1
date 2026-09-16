from playwright.sync_api import sync_playwright, Page, expect
from pathlib import Path
import os

def test_verify_appointment_form(page: Page):
    repo_root = Path(__file__).resolve().parent.parent
    app_url = (repo_root / "appointments.html").as_uri()

    print(f"Testing Appointment Form at: {app_url}")

    page.goto(app_url)

    # Close welcome modal if present
    try:
        # Force remove the modal from DOM to be sure
        page.evaluate("document.getElementById('demo-welcome-modal')?.remove()")
    except:
        pass

    # Fill form
    page.fill("#appName", "Test Patient")
    page.fill("#appDob", "1990-05-20")
    page.fill("#appPhone", "0871234567")
    page.fill("#appEmail", "test@example.com")
    page.fill("#appAddress", "123 Test Street")

    page.select_option("#appType", "Routine GP Visit")
    page.select_option("#appTime", "Morning (9am - 12pm)")

    page.fill("#appNotes", "Routine checkup")

    # Precompute config_url before registering route handler
    config_url = page.evaluate("CONFIG.SCRIPT_WEB_APP_URL")

    # Route handler to mock Apps Script response
    def handle_route(route):
        request = route.request
        if request.method == "POST":
            if request.url == config_url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"result": "success", "type": "appointment"}'
                )
            else:
                route.abort()
        else:
            route.continue_()

    page.route("**/*", handle_route)

    # Use expect_request wrapped around submit action
    with page.expect_request(lambda req: req.method == "POST") as req_info:
        page.click("button.submit-btn")

    request = req_info.value
    print("Request URL:", request.url)
    post_data = request.post_data_json
    print("Payload:", post_data)

    # Assertions
    assert request.url == config_url
    assert post_data["formType"] == "appointment"
    assert post_data["name"] == "Test Patient"
    assert post_data["type"] == "Routine GP Visit"

    # Check UI feedback
    expect(page.locator("#appSuccessMessage")).to_be_visible()
    expect(page.locator("#appointmentForm")).not_to_be_visible()

    page.screenshot(path="verification/appointment_success.png")
    print("Appointment verification successful.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_verify_appointment_form(page)
        except Exception as e:
            print(f"Verification Failed: {e}")
            raise e
        finally:
            browser.close()
