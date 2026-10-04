import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/i\.ytimg\.com|youtube-nocookie\.com|fonts\.googleapis\.com/, route => route.abort());
});

test("home opens Pig, accepts a roll and hold, and leaves during a bot turn", async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.5; });
  await page.goto("/#/");
  await page.getByRole("link", { name: "Try a two-minute experiment" }).click();
  await expect(page.locator("h1")).toHaveText("Pig: push your luck");
  await page.locator("[data-roll]").click();
  await page.locator("[data-hold]").click();
  await expect(page.locator(".pig-status")).toHaveText("The bot is rolling.");
  await page.locator('.site-header a[href="#/experiments"]').click();
  await expect(page.locator("h1")).toHaveText("Experiments");
  await expect(page.locator(".pig")).toHaveCount(0);
});

test("list search → game → Back retains filters, view, focus and scroll", async ({ page }) => {
  await page.goto("/#/?view=list");
  await page.getByRole("searchbox", { name: "Find a game" }).fill("a");
  const game = page.locator("#result-mario-kart");
  await game.focus();
  await game.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  await game.press("Enter");
  await expect(page.locator("h1")).toHaveText("Mario Kart");
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("a");
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(game).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
});

test("map keyboard selection persists and opens the motivator", async ({ page }) => {
  await page.goto("/#/?view=map");
  const hub = page.getByRole("button", { name: "Select Chance", exact: true });
  await hub.focus(); await hub.press("Enter");
  await expect(hub).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Open motivator", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("h1")).toHaveText("Chance");
});

test("section shortcuts retain the running Pig instance and one bot timer", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => { Math.random = () => 0.5; });
  await page.goto("/#/m/chance?section=play");
  await page.locator("[data-roll]").click(); await page.locator("[data-hold]").click();
  await page.locator(".pig").evaluate(el => el.setAttribute("data-instance", "original"));
  await page.getByRole("link", { name: "Examples", exact: true }).click();
  await expect(page.locator(".pig")).toHaveAttribute("data-instance", "original");
  await page.clock.runFor(650);
  await expect(page.locator("[data-turn]")).toHaveText("4");
});

test("video filter and thumbnail fallback work without YouTube", async ({ page }) => {
  await page.goto("/#/?view=list&videos=1");
  await expect(page.locator(".catalog-results > li")).toHaveCount(12);
  await expect(page.locator(".count")).toContainText("12 games");
  await page.locator("#result-tetris").click();
  await expect(page.getByRole("link", { name: "Watch on YouTube" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=-FAzHyXZPm0&t=60s");
  await expect(page.locator(".video-missing")).toContainText("preview could not load");
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("preference overrides viewport defaults and URL overrides preference", async ({ page, isMobile }) => {
  await page.goto("/#/");
  await expect(page.getByRole("button", { name: isMobile ? "List" : "Map", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: isMobile ? "Map" : "List", exact: true }).click();
  await page.goto("/#/");
  await expect(page.getByRole("button", { name: isMobile ? "Map" : "List", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#/?view=list");
  await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute("aria-pressed", "true");
});

for (const path of ["#/g/unknown", "#/play/unknown"]) test(`${path} is a useful not-found page`, async ({ page }) => {
  await page.goto(`/${path}`);
  await expect(page.locator("h1")).toHaveText("Not on the map");
  await expect(page.locator('main a[href="#/"]')).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) test(`${colorScheme} theme and reduced motion fit phone and desktop`, async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
  for (const hash of ["#/?view=map", "#/?view=list", "#/play/pig", "#/experiments", "#/about?section=contribute"]) {
    await page.goto(`/${hash}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    if (hash === "#/play/pig") {
      await page.locator("[data-roll]").focus();
      await expect(page.locator("[data-roll]")).toBeFocused();
      const control = await page.locator("[data-roll]").boundingBox();
      expect(control!.height).toBeGreaterThanOrEqual(44);
      expect(control!.width).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: testInfo.outputPath(`pig-${colorScheme}.png`), fullPage: true });
    }
    if (hash === "#/?view=list") await page.screenshot({ path: testInfo.outputPath(`list-${colorScheme}.png`) });
  }
});

test("Back restores the map Open motivator action and a result's motivator link", async ({ page }) => {
  await page.goto("/#/?view=map");
  const hub = page.getByRole("button", { name: "Select Chance", exact: true });
  await hub.focus(); await hub.press("Enter");
  const open = page.getByRole("link", { name: "Open motivator", exact: true });
  await open.focus(); await open.press("Enter"); await page.goBack();
  await expect(open).toBeFocused();
});

test("Back restores a catalog result motivator link", async ({ page }) => {
  await page.goto("/#/?view=list&q=Halo");
  const motivator = page.locator('.catalog-results a[href^="#/m/"]').first();
  await motivator.focus(); await motivator.press("Enter"); await page.goBack();
  await expect(motivator).toBeFocused();
});
