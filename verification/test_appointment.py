from playwright.sync_api import sync_playwright, Page, expect
import os

def verify_appointment_form(page: Page):
    cwd = os.getcwd()
    app_url = f"file://{cwd}/appointments.html"

    print(f"Testing Appointment Form at: {app_url}")

    page.goto(app_url)

    # Close welcome modal if present
    if page.is_visible("#demo-welcome-modal"):
        page.click("button:has-text('I Understand')")

    # Fill form
    page.fill("#appName", "Test Patient")
    page.fill("#appDob", "1990-05-20")
    page.fill("#appPhone", "0871234567")
    page.fill("#appEmail", "test@example.com")

    page.select_option("#appType", "Routine GP Visit")
    page.select_option("#appTime", "Morning (9am - 12pm)")

    page.fill("#appNotes", "Routine checkup")

    # Set up request interception
    with page.expect_request(lambda request: "script.google.com" in request.url and request.method == "POST") as request_info:
        page.click("button.submit-btn")

    request = request_info.value
    print("Request URL:", request.url)
    post_data = request.post_data_json
    print("Payload:", post_data)

    # Assertions
    assert "script.google.com" in request.url
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
            verify_appointment_form(page)
        except Exception as e:
            print(f"Verification Failed: {e}")
            raise e
        finally:
            browser.close()
