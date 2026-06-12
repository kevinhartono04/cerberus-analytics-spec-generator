import { expect, Page, test } from "@playwright/test";

async function hasInputValue(page: Page, value: string) {
  return page.locator("input").evaluateAll((inputs, expectedValue) =>
    inputs.some((input) => (input as HTMLInputElement).value === expectedValue),
  value);
}

async function hasTextareaValue(page: Page, value: string) {
  return page.locator("textarea").evaluateAll((textareas, expectedValue) =>
    textareas.some((textarea) => (textarea as HTMLTextAreaElement).value === expectedValue),
  value);
}

test("generates, edits, saves, reopens, and deletes a draft spec", async ({ page }) => {
  const existingSpecs = await page.request.get("/api/specs");
  for (const savedSpec of await existingSpecs.json()) {
    await page.request.delete(`/api/specs/${savedSpec.id}`);
  }

  await page.goto("/");
  await page.getByRole("button", { name: "Load Example" }).click();
  await page.getByRole("button", { name: "Generate Spec" }).click();

  await expect(page.getByText("Generated Events")).toBeVisible();
  await expect(page.getByText("Platform Ad Payload Enrichment")).toBeVisible();
  await expect(page.getByText("Game_Start")).toBeVisible();

  const firstTrigger = page.locator("textarea").first();
  await firstTrigger.fill("Edited trigger for test review.");
  await expect(firstTrigger).toHaveValue("Edited trigger for test review.");

  const firstPayloadDescription = page.locator('textarea[aria-label*=" description"]').first();
  await firstPayloadDescription.fill("Edited payload description for test review.");
  await expect(firstPayloadDescription).toHaveValue("Edited payload description for test review.");

  const firstPayloadExample = page.locator('textarea[aria-label*=" example"]').first();
  await firstPayloadExample.fill("edited_payload_example");
  await expect(firstPayloadExample).toHaveValue("edited_payload_example");

  await page.getByRole("button", { name: "Add Event" }).click();
  expect(await hasInputValue(page, "Custom_Event_12")).toBe(true);

  await page.getByRole("button", { name: "Save Spec" }).click();
  await expect(page.getByText(/Saved /)).toBeVisible();

  await page.getByRole("button", { name: "Saved Specs" }).click();
  await expect(page.getByText("Saved Game Specs")).toBeVisible();
  await expect(page.getByText("Sample Match Timed")).toBeVisible();

  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByText("Saved spec loaded")).toBeVisible();
  expect(await hasTextareaValue(page, "Edited trigger for test review.")).toBe(true);
  expect(await hasTextareaValue(page, "Edited payload description for test review.")).toBe(true);
  expect(await hasTextareaValue(page, "edited_payload_example")).toBe(true);

  await page.getByRole("button", { name: "Saved Specs" }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No saved specs yet")).toBeVisible();
});
