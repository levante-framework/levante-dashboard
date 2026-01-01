import asyncio
import os
import time
from playwright import async_api
from playwright.async_api import expect


async def run_test():
    email = os.environ.get("EMAIL")
    password = os.environ.get("PASSWORD")
    if not email or not password:
        raise RuntimeError("Missing EMAIL or PASSWORD in environment.")

    pw = await async_api.async_playwright().start()
    browser = await pw.chromium.launch(
        headless=True,
        args=[
            "--window-size=1280,720",
            "--disable-dev-shm-usage",
            "--ipc=host",
            "--single-process",
        ],
    )
    context = await browser.new_context()
    page = await context.new_page()
    page.set_default_timeout(5000)

    try:
        await page.goto("http://localhost:5173/signin", wait_until="domcontentloaded", timeout=30000)

        await page.locator('[data-cy="input-username-email"]').fill(email)
        await page.locator('[data-cy="input-password"]').fill(password)
        await page.locator('[data-cy="submit-sign-in-with-password"]').click()

        await page.locator('[data-testid="nav-bar"]').wait_for(state="visible", timeout=30000)
        await page.locator('[data-cy="nav-groups"]').click()
        await page.wait_for_url("**/list-groups", timeout=30000)

        await page.locator('[data-testid="groups-page-ready"]').wait_for(state="visible", timeout=60000)

        group_name = f"testsprite-site-{int(time.time())}"

        await page.locator('[data-testid="add-group-btn"]').click()
        await page.locator('[data-testid="modalTitle"]').wait_for(state="visible", timeout=20000)
        await page.locator('[data-cy="input-org-name"]').fill(group_name)
        await page.locator('[data-testid="submitBtn"]').click()

        await page.locator('[data-testid="modalTitle"]').wait_for(state="hidden", timeout=30000)
        await page.locator('[data-cy="search-groups-input"]').fill(group_name)
        await expect(page.get_by_text(group_name)).to_be_visible(timeout=20000)
    finally:
        await context.close()
        await browser.close()
        await pw.stop()


asyncio.run(run_test())
