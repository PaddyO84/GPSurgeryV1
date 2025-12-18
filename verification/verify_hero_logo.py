from playwright.sync_api import sync_playwright, Page, expect
import os

def verify_hero_logo(page: Page):
    cwd = os.getcwd()
    index_url = f"file://{cwd}/index.html"

    print(f"Verifying Hero Logo at: {index_url}")

    # Set viewport to Desktop size
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(index_url)

    # Close welcome modal if it appears (it should, as we cleared storage implicitly or strictly)
    if page.is_visible("#demo-welcome-modal"):
        page.click("button:has-text('I Understand')")

    # Check if logo exists and is visible
    logo = page.locator(".hero-logo")
    expect(logo).to_be_visible()

    # Check dimensions
    box = logo.bounding_box()
    print(f"Desktop Logo Dimensions: {box}")

    # Take screenshot
    page.screenshot(path="verification/hero_logo_desktop.png")

    # Test Mobile View
    page.set_viewport_size({"width": 375, "height": 667})

    # Close welcome modal if it appears again (unlikely in same session but good practice)
    if page.is_visible("#demo-welcome-modal"):
        page.click("button:has-text('I Understand')")

    logo_mobile = page.locator(".hero-logo")
    expect(logo_mobile).to_be_visible()

    box_mobile = logo_mobile.bounding_box()
    print(f"Mobile Logo Dimensions: {box_mobile}")

    page.screenshot(path="verification/hero_logo_mobile.png")
    print("Verification complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_hero_logo(page)
        except Exception as e:
            print(f"Verification Failed: {e}")
            raise e
        finally:
            browser.close()
