import { expect, type Page, test } from "@playwright/test";

async function allowAdaptation(page: Page) {
  const banner = page.getByRole("region", { name: /Let this interface adapt/ });
  await banner.getByRole("button", { name: "Allow on this device" }).click();
  await expect(page.getByRole("heading", { name: /Let this interface adapt/ })).toBeHidden();
}

test("asks before observing anything, and respects a no", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Let this interface adapt/ })).toBeVisible();
  await page.getByRole("button", { name: "Keep it standard" }).click();
  await expect(page.getByRole("link", { name: "Adaptation off" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: /Let this interface adapt/ })).toBeHidden();
});

test("the landing demo switches to plain language after two requests for help", async ({
  page,
}) => {
  await page.goto("/");
  const unclear = page.getByRole("button", { name: "This isn't clear" });
  await unclear.click();
  await unclear.click();
  await expect(page.getByText("Plain language", { exact: true })).toBeVisible();
  await expect(page.getByText(/Your data is kept in three copies/)).toBeVisible();
});

test("repeated help requests simplify the console's explanation and say why", async ({ page }) => {
  await page.goto("/console");
  await allowAdaptation(page);
  const explanation = page.getByRole("region", { name: "How your data is replicated" });
  for (let i = 0; i < 3; i++)
    await explanation.getByRole("button", { name: "This isn't clear" }).click();
  await expect(explanation.getByText(/Your data is kept in three copies/)).toBeVisible();
  await explanation.getByText("Why this looks different").click();
  await expect(explanation.getByText(/You asked for help several times/)).toBeVisible();
});

test("a strict confirmation requires typing the resource name", async ({ page }) => {
  await page.goto("/console");
  await allowAdaptation(page);
  await page.getByLabel("Risky actions").selectOption("strict");
  await page.getByRole("tab", { name: /Danger zone/ }).click();
  await page.getByRole("button", { name: "Decommission cluster" }).click();

  const dialog = page.getByRole("dialog", { name: /Decommission orbital-prod-eu/ });
  const confirm = dialog.getByRole("button", { name: "Decommission cluster" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Type orbital-prod-eu to confirm/).fill("orbital-prod");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Type orbital-prod-eu to confirm/).fill("orbital-prod-eu");
  await confirm.click();
  await expect(page.getByText("orbital-prod-eu is scheduled for decommission")).toBeVisible();
});

test("sustained keyboard navigation turns on shortcut hints", async ({ page }) => {
  await page.goto("/console");
  await allowAdaptation(page);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1_100);
  }
  await expect(page.getByText(/Keyboard shortcuts are on/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("body").focus();
  await page.keyboard.press("3");
  await expect(page.getByRole("tab", { name: /Migrate/ })).toHaveAttribute("aria-selected", "true");
});

test("form errors are reported by code and bring help next to the field", async ({ page }) => {
  await page.goto("/console");
  await allowAdaptation(page);
  await page.getByRole("tab", { name: /Deploy/ }).click();
  const replicas = page.getByLabel("Replicas");
  await replicas.fill("0");
  await replicas.blur();
  await expect(page.getByText("Enter a whole number from 1 to 20.")).toBeVisible();
  await expect(page.getByText(/How many copies run at the same time/)).toBeVisible();
  await expect(page.getByText(/field\.error/).first()).toBeVisible();
  await expect(page.getByText(/code=range/).first()).toBeVisible();
});

test("deleting everything forgets choices and asks again", async ({ page }) => {
  await page.goto("/privacy");
  await allowAdaptation(page);
  await expect(page.getByText(/"interaction": true/)).toBeVisible();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText(/Deleted\. Nothing is observed or stored/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Let this interface adapt/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("aie:v1"))).toBeNull();
});
