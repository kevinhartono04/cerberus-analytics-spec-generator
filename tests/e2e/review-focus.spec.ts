import { expect, test } from "@playwright/test";

test("keeps focus while typing in review payload name", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load Example" }).click();
  await page.getByRole("button", { name: "Generate Spec" }).click();

  await expect(page.getByText("Generated Events")).toBeVisible();

  const firstPayloadName = page.getByLabel(/payload name 1/).first();
  await firstPayloadName.fill("");
  await firstPayloadName.click();
  await page.keyboard.type("review_payload");

  await expect(firstPayloadName).toBeFocused();
  await expect(firstPayloadName).toHaveValue("review_payload");
});
