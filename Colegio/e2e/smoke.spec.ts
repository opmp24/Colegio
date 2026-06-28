import { test, expect } from "@playwright/test";

test("la página de login se carga correctamente", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1, h2").first()).toBeVisible();
  await expect(page).toHaveTitle(/Agenda|Login/);
});

test("redirige a login desde raíz si no hay sesión", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("404 redirige a raíz", async ({ page }) => {
  await page.goto("/ruta-inexistente");
  await expect(page).toHaveURL("/");
});

test("la página de login tiene un campo para código PIN", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="text"], input[type="password"]').first()).toBeVisible();
});
