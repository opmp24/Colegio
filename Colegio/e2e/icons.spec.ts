import { test, expect } from "@playwright/test";

test("el favicon se carga correctamente", async ({ page }) => {
  const response = await page.goto("/favicon.svg");
  expect(response?.status()).toBe(200);
});

test("la página es responsive (viewport móvil)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/login");
  await expect(page.locator("body")).toBeVisible();
});
