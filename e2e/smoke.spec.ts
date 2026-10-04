import { expect, test, type Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    // Fonts and video thumbnails come from the network; their failures are not page errors.
    if (msg.type() === "error" && !/fonts\.g|ytimg/.test(msg.text())) errors.push(msg.text());
  });
  return errors;
}

const pages: Array<[string, string]> = [
  ["/#/", "Why people play"],
  ["/#/m/chance", "Chance"],
  ["/#/m/fantasy", "Fantasy, role-play, and story"],
  ["/#/note", "Why people play: motivators and example games"],
  ["/#/about", "About the Atlas"],
];

for (const [path, heading] of pages) {
  test(`${path} renders without errors and fits the screen`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(path);
    await expect(page.locator("h1").first()).toHaveText(heading);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("a game card opens from the map", async ({ page }) => {
  await page.goto("/#/");
  await page.locator('g.game[data-game="halo"]').click();
  await expect(page.locator("dialog h2")).toHaveText("Halo");
});

test("Pig plays a roll", async ({ page }) => {
  await page.goto("/#/m/chance");
  await page.locator("[data-roll]").click();
  await expect(page.locator(".pig-die")).not.toHaveText("–");
});
