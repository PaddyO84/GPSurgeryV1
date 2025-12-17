from playwright.sync_api import sync_playwright, expect

def verify_accordion_exclusive(page):
    # Mobile viewport
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto("file:///app/order-prescription.html")

    # Add Medication A
    page.fill("#medName", "Medication A")
    page.fill("#medDosage", "10mg")
    page.select_option("#medFreq", "Once a day")
    page.click("button:has-text('+ Add')")

    # Add Medication B
    page.fill("#medName", "Medication B")
    page.fill("#medDosage", "20mg")
    page.select_option("#medFreq", "Twice a day")
    page.click("button:has-text('+ Add')")

    # Get rows
    rows = page.locator("#medicationList tr")
    row_a = rows.nth(0)
    row_b = rows.nth(1)

    # Initial state: both collapsed
    expect(row_a.locator("td").nth(1)).not_to_be_visible()
    expect(row_b.locator("td").nth(1)).not_to_be_visible()

    # Click A -> A expands
    row_a.click()
    expect(row_a.locator("td").nth(1)).to_be_visible()
    expect(row_b.locator("td").nth(1)).not_to_be_visible()

    # Click B -> B expands, A collapses
    row_b.click()
    expect(row_b.locator("td").nth(1)).to_be_visible()
    expect(row_a.locator("td").nth(1)).not_to_be_visible()

    # Take screenshot
    page.screenshot(path="verification/exclusive_accordion_verified.png")

    print("Exclusive accordion verification passed and screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_accordion_exclusive(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            exit(1)
        finally:
            browser.close()
