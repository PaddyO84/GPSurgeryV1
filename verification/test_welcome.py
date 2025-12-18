from playwright.sync_api import sync_playwright, Page, expect
import os

def test_welcome_modal(page: Page):
    cwd = os.getcwd()
    index_url = f"file://{cwd}/index.html"
    contact_url = f"file://{cwd}/contact.html"

    print(f"Testing Welcome Modal at: {index_url}")

    # 1. First Visit: Modal should appear
    page.goto(index_url)

    # Wait for modal
    modal = page.locator("#demo-welcome-modal")
    expect(modal).to_be_visible()

    # Check text
    expect(modal).to_contain_text("Welcome to the Demo Site")
    expect(modal).to_contain_text("NOT LIVE")

    print("Modal appeared on first visit.")
    page.screenshot(path="verification/welcome_modal_visible.png")

    # 2. Close Modal
    page.click("button:has-text('I Understand')")
    expect(modal).not_to_be_visible()
    print("Modal closed.")

    # 3. Reload: Modal should NOT appear
    page.reload()
    expect(modal).not_to_be_visible()
    print("Modal did not appear on reload.")

    # 4. Visit another page: Modal should NOT appear (shared local storage)
    page.goto(contact_url)
    expect(modal).not_to_be_visible()
    print("Modal did not appear on second page.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context to simulate a fresh session/storage
        context = browser.new_context()
        page = context.new_page()
        try:
            test_welcome_modal(page)
        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/welcome_failure.png")
            raise e
        finally:
            browser.close()
