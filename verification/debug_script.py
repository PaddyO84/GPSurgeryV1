from playwright.sync_api import sync_playwright

def debug_page():
    import os
    cwd = os.getcwd()
    url = f"file://{cwd}/order-prescription.html"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.goto(url)

        # Check if script tag exists
        script_content = page.evaluate("document.querySelector('script:not([src])').innerText")
        print("--- SCRIPT CONTENT START ---")
        print(script_content[:200])
        print("--- SCRIPT CONTENT END ---")

        # Check select
        count = page.evaluate("document.getElementById('chosenPharmacy').options.length")
        print(f"Options Count: {count}")

        browser.close()

if __name__ == "__main__":
    debug_page()
