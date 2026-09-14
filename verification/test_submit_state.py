from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 850})
    page.goto('http://127.0.0.1:8000/order-prescription.html')
    page.wait_for_load_state('networkidle')

    welcome_btn = page.locator("#demo-welcome-modal button:has-text('I Understand')")
    if welcome_btn.is_visible():
        welcome_btn.click()
        page.wait_for_timeout(300)

    # Scroll down to bottom first as user does before clicking review & submit
    page.locator('.submit-btn').scroll_into_view_if_needed()
    page.wait_for_timeout(200)

    print("Scroll before submit:", page.evaluate("window.scrollY"))

    # Trigger submit simulation using updated logic
    page.evaluate('''() => {
        document.getElementById('prescriptionForm').style.display = 'none';
        const appContainer = document.querySelector('.form-app-container');
        if (appContainer) {
            appContainer.classList.add('form-submitted');
        }
        ['btnLoadFile', 'btnSaveFile', 'btnPrintSummary'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
        const successDiv = document.getElementById('successMessage');
        successDiv.innerHTML = `
            <div class="success-animation">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>
            </div>
            <h2 class="success-title">Request Submitted</h2>
            <p class="success-message">Your reference number is: <strong>CHC-20260914-1234</strong>. A confirmation has been sent via email. Please allow 48 hours for processing.</p>
            <button class="btn" onclick="location.reload()">Submit Another Request</button>
        `;
        successDiv.style.display = 'block';
        if (appContainer) {
            appContainer.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    }''')
    page.wait_for_timeout(300)

    print("Scroll after submit (updated):", page.evaluate("window.scrollY"))
    box = page.locator('.form-app-container').bounding_box()
    print("form-app-container bounding box:", box)
    sidebar_vis = page.locator('.sidebar').is_visible()
    clear_enabled = page.locator('#btnClearForm').is_enabled()
    save_disabled = page.locator('#btnSaveFile').is_disabled()
    print(f"sidebar_vis: {sidebar_vis}, clear_enabled: {clear_enabled}, save_disabled: {save_disabled}")

    page.screenshot(path='verification/success_state_current.png')
    browser.close()
    print("Screenshot saved to verification/success_state_current.png")
