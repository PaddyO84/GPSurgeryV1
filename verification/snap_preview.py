import os
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 850})
    page.add_init_script("localStorage.setItem('demo_welcome_seen', 'true');")
    base_url = os.environ.get('PREVIEW_BASE_URL', 'http://127.0.0.1:8000').rstrip('/')
    page.goto(f'{base_url}/order-prescription.html')
    page.wait_for_load_state('networkidle')

    # Dismiss welcome modal if present
    welcome_btn = page.locator("#demo-welcome-modal button:has-text('I Understand')")
    if welcome_btn.is_visible():
        welcome_btn.click()
        page.wait_for_timeout(300)

    # Scroll directly to Section 2
    page.locator('.form-section:has-text("2. Add Medications")').scroll_into_view_if_needed()
    page.wait_for_timeout(200)

    # Test dropdown toggle (open dropdown)
    page.click('#medComboboxToggle')
    page.wait_for_timeout(200)
    page.locator('.form-section:has-text("2. Add Medications")').screenshot(path='verification/combobox_open.png')

    # Select medication from dropdown
    page.click('.med-combobox-option:has-text("Atorvastatin")')
    page.fill('#medDosage', '100mg')
    page.select_option('#medFreq', 'Once a day')
    page.click('.add-med-btn')
    page.wait_for_timeout(200)

    # Check widths
    t_box = page.locator('#medicationTable').bounding_box()
    th_box = page.locator('#medicationTable thead').bounding_box()
    grp_box = page.locator('.add-med-group').bounding_box()
    print(f"add-med-group width: {grp_box['width']}")
    print(f"table width: {t_box['width']}")
    print(f"thead width: {th_box['width']}")

    page.locator('.form-section:has-text("2. Add Medications")').screenshot(path='verification/local_preview_order_prescription.png')
    browser.close()
    print("Screenshots saved!")

