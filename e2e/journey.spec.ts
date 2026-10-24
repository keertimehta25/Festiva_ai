import { expect, test } from '@playwright/test';
import { runAxe, shot, signIn } from './helpers';

test.describe('Festiva AI: main journey', () => {
  test('landing page shows the primary calls to action and passes the accessibility audit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Big celebrations');
    await expect(page.getByRole('link', { name: 'Plan My Event' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Features' })).toBeVisible();
    await shot(page, 'landing');
    expect(await runAxe(page)).toEqual([]);
  });

  test('plan an event end to end: create, AI plan, budget, task, vendor, copilot, persistence', async ({ page }) => {
    await signIn(page);
    await page.goto('/events/new');

    // 1. Create the event
    await page.getByLabel('Event name').fill('Meera and Karan Wedding');
    await page.getByLabel('City').fill('Jaipur');
    await page.getByLabel('Estimated budget (₹)').fill('8,00,000');
    await page.getByLabel('Expected guests').fill('300');
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Meera and Karan Wedding' })).toBeVisible();

    // 2. Generate the AI plan (real route and validation; canned provider in the test server)
    await page.getByRole('link', { name: 'AI plan' }).click();
    await page.getByRole('button', { name: 'Generate AI plan' }).click();
    await expect(page.getByText('Heritage garden wedding').first()).toBeVisible();
    await shot(page, 'plan');
    expect(await runAxe(page)).toEqual([]);

    // 3. Budget: adding an expense updates the remaining balance
    await page.getByRole('link', { name: 'Budget' }).click();
    await expect(page.getByText('Spent so far')).toBeVisible();
    await page.getByRole('button', { name: 'Add expense' }).click();
    const expenseDialog = page.getByRole('dialog');
    await expenseDialog.getByLabel('What is it for?').fill('Venue advance');
    await expenseDialog.getByLabel('Category').selectOption('venue');
    await expenseDialog.getByLabel('Actual amount paid (₹)').fill('100000');
    await expenseDialog.getByRole('button', { name: 'Add expense' }).click();
    await expect(page.getByRole('cell', { name: 'Venue advance' })).toBeVisible();
    await expect(page.locator('.stat', { hasText: 'Remaining' })).toContainText('7,00,000');
    await shot(page, 'budget');
    expect(await runAxe(page)).toEqual([]);

    // 4. Tasks
    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.getByRole('button', { name: 'Add task' }).click();
    const taskDialog = page.getByRole('dialog');
    await taskDialog.getByLabel('Task', { exact: true }).fill('Order marigold garlands');
    await taskDialog.getByRole('button', { name: /add task|save/i }).click();
    await expect(page.getByText('Order marigold garlands')).toBeVisible();
    expect(await runAxe(page)).toEqual([]);

    // 5. Vendors
    await page.getByRole('link', { name: 'Vendors' }).click();
    await page.getByRole('button', { name: 'Add vendor' }).click();
    const vendorDialog = page.getByRole('dialog');
    await vendorDialog.getByLabel('Vendor name').fill('Example Caterers');
    await vendorDialog.getByLabel('Category').selectOption('caterer');
    await vendorDialog.getByLabel('Quoted price (₹)').fill('250000');
    await vendorDialog.getByLabel('Booking status').selectOption('booked');
    await vendorDialog.getByRole('button', { name: /add vendor|save/i }).click();
    await expect(page.getByText('Example Caterers')).toBeVisible();
    expect(await runAxe(page)).toEqual([]);

    // 6. Copilot: a reply, and a proposal that is only applied after confirmation
    await page.getByRole('link', { name: 'Copilot' }).click();
    await page.getByLabel('Your question').fill('What should I do first?');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('log', { name: 'Conversation' })).toContainText('Book your entertainment early');
    await expect(page.getByText('Add task “Book the DJ”')).toBeVisible();
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page.getByText('Book the DJ')).toHaveCount(0);
    await page.getByRole('link', { name: 'Copilot' }).click();
    await page.getByLabel('Your question').fill('Suggest a task');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Apply this change' }).first().click();
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page.getByText('Book the DJ').first()).toBeVisible();

    // 7. Everything survives a refresh
    await page.reload();
    await expect(page.getByText('Book the DJ').first()).toBeVisible();
    await page.getByRole('link', { name: 'Budget' }).click();
    await expect(page.getByRole('cell', { name: 'Venue advance' })).toBeVisible();
    await page.getByRole('link', { name: 'AI plan' }).click();
    await expect(page.getByText('Heritage garden wedding').first()).toBeVisible();
  });

  test('invalid input is rejected with readable messages and deleting an event asks for confirmation', async ({ page }) => {
    await signIn(page);
    await page.goto('/events/new');
    await page.getByLabel('Event name').fill('Tiny party');
    await page.getByLabel('Estimated budget (₹)').fill('-5');
    await page.getByLabel('Expected guests').fill('0');
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.locator('.field-error').first()).toBeVisible();
    await expect(page).toHaveURL(/events\/new/);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: /^Delete / }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
