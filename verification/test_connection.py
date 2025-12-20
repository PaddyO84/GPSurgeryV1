from playwright.sync_api import sync_playwright, Page, expect

def verify_forms_wiring(page: Page):
    # Get the absolute path to the HTML files
    import os
    cwd = os.getcwd()
    prescription_url = f"file://{cwd}/order-prescription.html"
    sick_note_url = f"file://{cwd}/sick-notes.html"

    print(f"Testing Prescription Form at: {prescription_url}")

    # 1. Test Prescription Form
    page.goto(prescription_url)

    # Mock the network request to the Google Script
    # We want to verify it sends the right data to the right URL
    target_url_fragment = "/exec"

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
    except:
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

    # Set up request interception for the final submit
    with page.expect_request(lambda request: "script.google.com" in request.url and request.method == "POST") as request_info:
        page.click("button.btn-confirm")

    request = request_info.value
    print("Prescription Request URL:", request.url)
    post_data = request.post_data_json
    print("Prescription Payload:", post_data)

    assert "script.google.com" in request.url
    assert post_data["formType"] == "prescription"
    assert post_data["patientDetails"]["name"] == "John Doe"
    assert len(post_data["medicationList"]) == 1

    page.screenshot(path="verification/prescription_success.png")
    print("Prescription verification successful.")

    # 2. Test Sick Note Form
    print(f"Testing Sick Note Form at: {sick_note_url}")
    page.goto(sick_note_url)

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

    # Signature (Canvas)
    canvas = page.locator("#signatureCanvas")
    box = canvas.bounding_box()
    page.mouse.move(box["x"] + 10, box["y"] + 10)
    page.mouse.down()
    page.mouse.move(box["x"] + 100, box["y"] + 100)
    page.mouse.up()

    page.check("#declaration")

    # Submit
    page.click("button.submit-btn") # Opens modal
    page.wait_for_selector("#summaryModal", state="visible")

    # Intercept
    with page.expect_request(lambda request: "script.google.com" in request.url and request.method == "POST") as request_info_sick:
        page.click("button.btn-confirm")

    request_sick = request_info_sick.value
    print("Sick Note Request URL:", request_sick.url)
    post_data_sick = request_sick.post_data_json
    print("Sick Note Payload:", post_data_sick)

    assert "script.google.com" in request_sick.url
    assert post_data_sick["formType"] == "sick-note"
    assert post_data_sick["name"] == "Jane Doe"
    assert post_data_sick["condition"] == "Flu"
    assert "data:image/png;base64" in post_data_sick["signature"]

    page.screenshot(path="verification/sicknote_success.png")
    print("Sick Note verification successful.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_forms_wiring(page)
        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise e
        finally:
            browser.close()
