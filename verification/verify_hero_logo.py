from playwright.sync_api import sync_playwright, Page, expect
from pathlib import Path
import os

def verify_hero_logo(page: Page):
    repo_root = Path(__file__).resolve().parent.parent
    index_url = (repo_root / "index.html").as_uri()

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

    # Validate the image has fully loaded (naturalWidth > 0 means the resource was fetched).
    natural_width = logo.evaluate("el => el.naturalWidth")
    assert natural_width and natural_width > 0, "Hero logo image has not finished loading (naturalWidth is 0)"

    # Check dimensions
    box = logo.bounding_box()
    print(f"Desktop Logo Dimensions: {box}")
    assert box is not None, "Desktop logo bounding box should not be None"
    assert box["width"] > 0 and box["height"] > 0, "Desktop logo should have non-zero dimensions"
    assert box["width"] <= 450, f"Desktop logo width {box['width']} exceeds max-width 450px"

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
    assert box_mobile is not None, "Mobile logo bounding box should not be None"
    assert box_mobile["width"] > 0 and box_mobile["height"] > 0, "Mobile logo should have non-zero dimensions"
    assert box_mobile["width"] <= 375, f"Mobile logo width {box_mobile['width']} exceeds viewport width 375px"
    assert box_mobile["x"] >= 0, f"Mobile logo left offset {box_mobile['x']} is negative"
    assert box_mobile["x"] + box_mobile["width"] <= 375, f"Mobile logo right edge {box_mobile['x'] + box_mobile['width']} exceeds viewport width 375px"

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
