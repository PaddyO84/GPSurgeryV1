from playwright.sync_api import sync_playwright, expect

def verify_theme(page):
    # Test Green (Default)
    page.goto("file:///app/index.html")
    # Verify no data-theme or default
    html = page.locator("html")

    # Test Blue
    page.goto("file:///app/index.html?theme=blue")
    expect(html).to_have_attribute("data-theme", "blue")

    # Verify color computation
    # The .top-bar should have background-color #005eb8
    top_bar = page.locator(".top-bar")
    # Note: computed style might return rgb
    # #005eb8 is rgb(0, 94, 184)
    expect(top_bar).to_have_css("background-color", "rgb(0, 94, 184)")

    # Screenshot Blue
    page.screenshot(path="verification/theme_blue.png")

    # Test Teal
    page.goto("file:///app/index.html?theme=teal")
    expect(html).to_have_attribute("data-theme", "teal")
    # #00897b is rgb(0, 137, 123)
    expect(top_bar).to_have_css("background-color", "rgb(0, 137, 123)")

    # Screenshot Teal
    page.screenshot(path="verification/theme_teal.png")

    print("Theme verification passed and screenshots saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_theme(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            exit(1)
        finally:
            browser.close()
