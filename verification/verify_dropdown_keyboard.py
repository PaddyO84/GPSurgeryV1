import os
from pathlib import Path
from playwright.sync_api import sync_playwright

def verify_dropdown():
    cwd = Path.cwd()
    index_uri = (cwd / "index.html").resolve().as_uri()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(index_uri)
        page.wait_for_timeout(500)

        # Locate the first dropdown trigger and its dropdown content
        trigger = page.locator('.dropdown-trigger').first
        content = trigger.locator('xpath=following-sibling::div[contains(@class, "dropdown-content")]')

        # 1. Initial State: aria-expanded="false", content hidden
        aria_expanded = trigger.get_attribute("aria-expanded")
        assert aria_expanded == "false", f"Expected aria-expanded to be 'false', got '{aria_expanded}'"
        assert not content.is_visible(), "Dropdown content should be hidden initially"

        # 2. Focus the trigger (keyboard navigation)
        trigger.focus()
        page.wait_for_timeout(200)

        # Ensure that merely focusing the trigger does not display the dropdown content
        # (This validates our CSS focus-within fix)
        assert not content.is_visible(), "Dropdown content should not be visible on trigger focus alone"

        # 3. Press Enter to open
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)

        aria_expanded = trigger.get_attribute("aria-expanded")
        assert aria_expanded == "true", f"Expected aria-expanded to be 'true' after Enter, got '{aria_expanded}'"
        assert content.is_visible(), "Dropdown content should be visible after Enter"

        # 4. Press Enter again while trigger remains focused to close
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)

        aria_expanded = trigger.get_attribute("aria-expanded")
        assert aria_expanded == "false", f"Expected aria-expanded to be 'false' after second Enter, got '{aria_expanded}'"
        assert not content.is_visible(), "Dropdown content should close on Enter even while trigger remains focused"

        # 5. Press Space to open
        page.keyboard.press("Space")
        page.wait_for_timeout(300)

        aria_expanded = trigger.get_attribute("aria-expanded")
        assert aria_expanded == "true", f"Expected aria-expanded to be 'true' after Space, got '{aria_expanded}'"
        assert content.is_visible(), "Dropdown content should be visible after Space"

        # 6. Press Space again while trigger remains focused to close
        page.keyboard.press("Space")
        page.wait_for_timeout(300)

        aria_expanded = trigger.get_attribute("aria-expanded")
        assert aria_expanded == "false", f"Expected aria-expanded to be 'false' after second Space, got '{aria_expanded}'"
        assert not content.is_visible(), "Dropdown content should close on Space even while trigger remains focused"

        print("All dropdown keyboard and CSS visibility checks passed successfully!")
        browser.close()

if __name__ == "__main__":
    verify_dropdown()
