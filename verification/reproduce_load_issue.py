from playwright.sync_api import sync_playwright, expect
import os

def reproduce_issue(page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

    page.goto("file:///app/order-prescription.html")

    # Upload the file
    print("Uploading file...")
    file_input = page.locator("#loadFile")
    file_input.set_input_files("test_prescription.json")

    # Wait for processing
    page.wait_for_timeout(1000)

    # Check if Name is populated
    name_val = page.locator("#patientName").input_value()
    print(f"Patient Name: '{name_val}'")

    if name_val != "John Doe":
        print("FAILURE: Patient name not populated.")
    else:
        print("SUCCESS: Patient name populated.")

    # Check if Table rows exist
    rows = page.locator("#medicationList tr")
    count = rows.count()
    print(f"Medication rows found: {count}")

    if count != 2:
        print("FAILURE: Medication rows not populated correctly.")
    else:
        print("SUCCESS: Medication rows populated.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            reproduce_issue(page)
        except Exception as e:
            print(f"Script failed: {e}")
        finally:
            browser.close()
