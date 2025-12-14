from playwright.sync_api import sync_playwright, expect

def verify_dropdown(page):
    page.goto("file:///app/order-prescription.html")

    # Verify dropdown exists
    dropdown = page.locator("#communicationPref")
    expect(dropdown).to_be_visible()

    # Verify default is Email
    expect(dropdown).to_have_value("Email")

    # Select WhatsApp
    dropdown.select_option("WhatsApp")
    expect(dropdown).to_have_value("WhatsApp")

    # Take screenshot of the form area with dropdown
    page.locator("#prescriptionForm").screenshot(path="verification/dropdown_verified.png")

    print("Dropdown verification passed and screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_dropdown(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            exit(1)
        finally:
            browser.close()
