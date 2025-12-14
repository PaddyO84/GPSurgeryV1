from playwright.sync_api import sync_playwright
import os

def verify_mobile_issues():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Mobile Viewport
        context_mobile = browser.new_context(viewport={'width': 375, 'height': 800}, is_mobile=True)
        page_mobile = context_mobile.new_page()

        cwd = os.getcwd()

        # Check Prescription Page
        prescription_url = f"file://{cwd}/order-prescription.html"
        print(f"Navigating to {prescription_url} (Mobile)")
        page_mobile.goto(prescription_url)
        page_mobile.wait_for_load_state('networkidle')

        # Take full page screenshot to see layout issues
        page_mobile.screenshot(path="verification/mobile_prescription_page.png", full_page=True)
        print("Mobile prescription page screenshot saved.")

        # Check Header/Logo specifically on Index
        index_url = f"file://{cwd}/index.html"
        print(f"Navigating to {index_url} (Mobile)")
        page_mobile.goto(index_url)
        page_mobile.locator("header").screenshot(path="verification/mobile_header.png")
        print("Mobile header screenshot saved.")

        # Check Header/Logo on Desktop
        context_desktop = browser.new_context(viewport={'width': 1280, 'height': 800})
        page_desktop = context_desktop.new_page()
        print(f"Navigating to {index_url} (Desktop)")
        page_desktop.goto(index_url)
        page_desktop.locator("header").screenshot(path="verification/desktop_header.png")
        print("Desktop header screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_mobile_issues()
