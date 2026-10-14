import os
from playwright.sync_api import sync_playwright

from pathlib import Path

def run_verification(page):
    cwd = Path.cwd()
    # 1. Verify prescription_form.html
    page.goto((cwd / "prescription_form.html").resolve().as_uri())
    page.wait_for_timeout(500)

    # Dismiss welcome modal if present
    welcome_btn = page.query_selector(".welcome-modal button, #welcomeModal button")
    if welcome_btn and welcome_btn.is_visible():
        welcome_btn.click()
        page.wait_for_timeout(500)

    # Fill form
    page.fill("#patientName", "Test Patient")
    page.fill("#patientEmail", "test@example.com")
    page.fill("#patientPhone", "0871234567")
    page.fill("#patientDOB", "1990-01-01")
    page.fill("#patientAddress", "123 Test St")
    page.select_option("#chosenPharmacy", value="Tierney's Healthwise Pharmacy, Buncrana")

    page.fill("#medName", "Amoxicillin")
    page.fill("#medDosage", "500mg")
    page.click("button:has-text('+ Add')")
    page.wait_for_timeout(500)

    page.click("button:has-text('Review & Submit Request')")
    page.wait_for_timeout(1000)

    # Confirm summary modal is visible and verified before screenshot
    prescription_modal = page.locator("#summaryModal")
    prescription_modal.wait_for(state="visible", timeout=5000)
    summary_text = page.locator("#summaryDetails").inner_text()
    assert "Test Patient" in summary_text, "Expected 'Test Patient' in summary"
    assert "Amoxicillin" in summary_text, "Expected 'Amoxicillin' in summary"

    screenshots_dir = os.path.join(cwd, "verification", "screenshots")
    videos_dir = os.path.join(cwd, "verification", "videos")
    os.makedirs(screenshots_dir, exist_ok=True)
    os.makedirs(videos_dir, exist_ok=True)

    page.screenshot(path=os.path.join(screenshots_dir, "prescription_form_summary.png"))

    # 2. Verify sick-notes.html
    page.goto((cwd / "sick-notes.html").resolve().as_uri())
    page.wait_for_timeout(500)

    welcome_btn = page.query_selector(".welcome-modal button, #welcomeModal button")
    if welcome_btn and welcome_btn.is_visible():
        welcome_btn.click()
        page.wait_for_timeout(500)

    page.fill("#firstName", "John")
    page.fill("#lastName", "Sick")
    page.fill("#dob", "1985-05-15")
    page.fill("#phone", "0889998888")
    page.fill("#email", "sick@example.com")
    page.fill("#address", "45 Park Ave")
    page.check("input[name='certType'][value='Private']")
    page.fill("#condition", "Flu")
    page.fill("#startDate", "2026-10-01")
    page.fill("#endDate", "2026-10-05")
    page.check("input[name='returnToWork'][value='No']")
    page.check("#declaration")

    # Perform signature on canvas to trigger event listeners
    page.evaluate("""() => {
        const canvas = document.getElementById('signatureCanvas');
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: rect.left + 20, clientY: rect.top + 20, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + 50, clientY: rect.top + 50, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: rect.left + 50, clientY: rect.top + 50, bubbles: true }));
    }""")

    page.click("button:has-text('Review & Submit')")
    page.wait_for_timeout(1000)

    # Confirm summary modal is visible and verified before screenshot
    sick_note_modal = page.locator("#summaryModal")
    sick_note_modal.wait_for(state="visible", timeout=5000)
    sick_note_text = page.locator("#summaryDetails").inner_text()
    assert "John Sick" in sick_note_text, "Expected 'John Sick' in sick note summary"
    assert "Flu" in sick_note_text, "Expected 'Flu' in sick note summary"

    page.screenshot(path=os.path.join(screenshots_dir, "sick_note_summary.png"))

if __name__ == "__main__":
    cwd = os.getcwd()
    screenshots_dir = os.path.join(cwd, "verification", "screenshots")
    videos_dir = os.path.join(cwd, "verification", "videos")
    os.makedirs(screenshots_dir, exist_ok=True)
    os.makedirs(videos_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir=videos_dir
        )
        page = context.new_page()
        try:
            run_verification(page)
        finally:
            context.close()
            browser.close()
