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

test("a game page opens from the map", async ({ page }) => {
  await page.goto("/#/?view=map");
  await page.locator('g.game[data-game="halo"] circle').click();
  await expect(page.locator("h1")).toHaveText("Halo");
});

test("Pig plays a roll", async ({ page }) => {
  await page.goto("/#/m/chance");
  await page.locator("[data-roll]").click();
  await expect(page.locator(".pig-die")).not.toHaveText("–");
});

test("aiming near a dot, not exactly on it, lights and opens that game", async ({ page }) => {
  await page.goto("/#/?view=map");
  const near = async (slug: string) => {
    const dot = page.locator(`g.game[data-game="${slug}"] circle`);
    await dot.scrollIntoViewIfNeeded();
    const box = (await dot.boundingBox())!;
    return { x: box.x + box.width / 2 + 5, y: box.y + box.height / 2 + 4 };
  };
  for (const slug of ["halo", "dark-souls"]) {
    const { x, y } = await near(slug);
    await page.mouse.move(x, y);
    await expect(page.locator(`g.game[data-game="${slug}"]`)).toHaveClass(/hover/);
    await expect(page.locator(`g.game[data-game="${slug}"] text`)).toHaveCSS("opacity", "1");
  }
  const { x, y } = await near("dark-souls");
  await page.mouse.click(x, y);
  await expect(page.locator("h1")).toHaveText("Dark Souls");
});
