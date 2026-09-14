import os
from playwright.sync_api import Page, expect

def test_appointments_accordion_styling(page: Page, base_url: str):
    page.goto(f"{base_url}/appointments.html")
    page.wait_for_load_state("networkidle")

    # Locate accordion buttons
    accordions = page.locator(".accordion")
    count = accordions.count()
    assert count >= 5, f"Expected at least 5 accordion items, got {count}"

    first_accordion = accordions.first
    expect(first_accordion).to_be_visible()

    # Dismiss welcome modal if present
    welcome_btn = page.locator("#demo-welcome-modal button:has-text('I Understand')")
    if welcome_btn.is_visible():
        welcome_btn.click()
        page.wait_for_timeout(300)

    # Capture visual verification of appointments page without modal
    page.screenshot(path="verification/appointments_accordion_styled.png", full_page=True)
    print("Screenshot saved to verification/appointments_accordion_styled.png")

    import re
    # Click first accordion and test toggle
    first_accordion.click()
    expect(first_accordion).to_have_class(re.compile(r"\bactive\b"))
    first_panel = page.locator(".panel").first
    page.wait_for_timeout(400)
    page.screenshot(path="verification/appointments_accordion_expanded.png")
    print("Expanded screenshot saved to verification/appointments_accordion_expanded.png")
