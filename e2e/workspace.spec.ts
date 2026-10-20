import { expect, test } from "@playwright/test";

test("renders the local-first workspace and exposes its security metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Make your files/ })).toBeVisible();
  await expect(page.getByText("PROCESSING WORKSPACE")).toBeVisible();
  await expect(page.getByRole("button", { name: "Merge PDF Join multiple documents · Multiple PDFs" })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
});

test("switches to a multi-file PDF workflow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Merge PDF Join multiple documents · Multiple PDFs" }).click();
  await expect(page.getByRole("heading", { name: "Drop files here" })).toBeVisible();
  await expect(page.getByText("Multiple PDFs · up to 50 MB per file")).toBeVisible();
});
