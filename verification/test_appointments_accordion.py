import os
from playwright.sync_api import Page, expect

def test_appointments_accordion_styling(page: Page, base_url: str):
    page.add_init_script("localStorage.setItem('demo_welcome_seen', 'true');")
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
    expect(first_accordion).to_have_attribute("aria-expanded", "true")
    first_panel = page.locator(".panel").first
    page.wait_for_timeout(400)
    # Verify first panel is rendered expanded (height > 0 and display / scrollHeight matching)
    expect(first_panel).to_be_visible()
    first_box = first_panel.bounding_box()
    assert first_box is not None and first_box["height"] > 0, "First panel should be expanded with height > 0"
    page.screenshot(path="verification/appointments_accordion_expanded.png")
    print("Expanded screenshot saved to verification/appointments_accordion_expanded.png")

    # Click second accordion and verify first closes while second opens
    second_accordion = accordions.nth(1)
    second_panel = page.locator(".panel").nth(1)
    second_accordion.click()
    page.wait_for_timeout(400)
    expect(second_accordion).to_have_class(re.compile(r"\bactive\b"))
    expect(second_accordion).to_have_attribute("aria-expanded", "true")
    expect(first_accordion).not_to_have_class(re.compile(r"\bactive\b"))
    expect(first_accordion).to_have_attribute("aria-expanded", "false")

    second_box = second_panel.bounding_box()
    assert second_box is not None and second_box["height"] > 0, "Second panel should be expanded with height > 0"
    first_box_after = first_panel.bounding_box()
    assert first_box_after is None or first_box_after["height"] == 0, "First panel should be collapsed with height 0"
