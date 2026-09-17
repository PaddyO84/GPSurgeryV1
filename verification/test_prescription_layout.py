import pytest
from playwright.sync_api import Page, expect

def test_prescription_layout(page: Page, base_url: str):
    # Deterministically dismiss welcome modal before navigation
    page.add_init_script("localStorage.setItem('demo_welcome_seen', 'true');")

    # Test Desktop 1280
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/order-prescription.html")
    page.wait_for_load_state("networkidle")

    welcome_btn = page.locator("#demo-welcome-modal button:has-text('I Understand')")
    if welcome_btn.is_visible():
        welcome_btn.click()
        page.wait_for_timeout(300)

    box_form = page.locator(".main-form-area").bounding_box()
    box_med = page.locator(".add-med-group").bounding_box()
    assert box_form is not None and box_med is not None
    assert box_med["x"] + box_med["width"] <= box_form["x"] + box_form["width"] + 1, "Overflow on 1280px!"
    page.locator(".add-med-group").scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    page.screenshot(path="verification/prescription_1280.png")

    # Test Tablet 1024
    page.set_viewport_size({"width": 1024, "height": 768})
    page.locator(".add-med-group").scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    box_form1024 = page.locator(".main-form-area").bounding_box()
    box_med1024 = page.locator(".add-med-group").bounding_box()
    assert box_form1024 is not None and box_med1024 is not None
    assert box_med1024["x"] + box_med1024["width"] <= box_form1024["x"] + box_form1024["width"] + 1, "Overflow on 1024px!"
    page.screenshot(path="verification/prescription_1024.png")

    # Test Mobile 390
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator(".add-med-group").scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    box_form390 = page.locator(".main-form-area").bounding_box()
    box_med390 = page.locator(".add-med-group").bounding_box()
    assert box_form390 is not None and box_med390 is not None
    assert box_med390["x"] + box_med390["width"] <= box_form390["x"] + box_form390["width"] + 1, "Overflow on 390px!"
    page.screenshot(path="verification/prescription_390.png")
