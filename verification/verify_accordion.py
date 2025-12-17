from playwright.sync_api import sync_playwright, expect

def verify_accordion(page):
    page.set_viewport_size({"width": 375, "height": 812}) # Mobile
    page.goto("file:///app/order-prescription.html")

    # Add medication
    page.fill("#medName", "Paracetamol")
    page.fill("#medDosage", "500mg")
    page.select_option("#medFreq", "Once a day")
    page.click("button:has-text('+ Add')")

    # Verify row exists and is collapsed
    row = page.locator("#medicationList tr").first
    # Name should be visible
    expect(row).to_contain_text("Paracetamol")
    # Dosage cell (index 1) should be hidden
    dosage_cell = row.locator("td").nth(1)
    expect(dosage_cell).not_to_be_visible()

    # Click to expand
    row.click()

    # Verify expansion
    expect(dosage_cell).to_be_visible()
    expect(row).to_contain_text("500mg")

    # Verify Edit button exists
    edit_btn = row.locator("button.edit-btn")
    expect(edit_btn).to_be_visible()

    # Click Edit
    edit_btn.click()

    # Verify row is removed
    expect(row).not_to_be_visible()

    # Verify data back in inputs
    expect(page.locator("#medName")).to_have_value("Paracetamol")
    expect(page.locator("#medDosage")).to_have_value("500mg")
    expect(page.locator("#medFreq")).to_have_value("Once a day")

    # Take screenshot
    page.screenshot(path="verification/accordion_verified.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_accordion(page)
            print("Accordion verification passed.")
        except Exception as e:
            print(f"Verification failed: {e}")
            exit(1)
        finally:
            browser.close()
