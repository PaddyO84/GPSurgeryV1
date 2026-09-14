import pytest
from playwright.sync_api import Page, expect

def test_prescription_layout(page: Page, base_url: str):
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
    assert box_med1024["x"] + box_med1024["width"] <= box_form1024["x"] + box_form1024["width"] + 1, "Overflow on 1024px!"
    page.screenshot(path="verification/prescription_1024.png")

    # Test Mobile 800
    page.set_viewport_size({"width": 800, "height": 900})
    page.locator(".add-med-group").scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    box_form800 = page.locator(".main-form-area").bounding_box()
    box_med800 = page.locator(".add-med-group").bounding_box()
    assert box_med800["x"] + box_med800["width"] <= box_form800["x"] + box_form800["width"] + 1, "Overflow on 800px!"
    page.screenshot(path="verification/prescription_800.png")
