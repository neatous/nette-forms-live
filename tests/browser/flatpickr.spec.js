// flatpickr is supported out of the box: the visible altInput is marked and focused, without opening the calendar,
// and picking a date validates the original input again.
import { expect, test } from '@playwright/test';

test('a flatpickr error is shown on the alt input, focused without opening the calendar', async ({ page }) => {
    await page.goto('/tests/browser/flatpickr.html');
    await page.click('#submit');

    const altInput = page.locator('#date + input');

    await expect(altInput).toHaveClass(/is-invalid/);
    await expect(altInput).toBeFocused();
    await expect(page.locator('.flatpickr-calendar.open')).toHaveCount(0);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveText('Choose a date');

    await page.evaluate(() => document.getElementById('date')._flatpickr.setDate('2026-01-15', true));

    await expect(altInput).not.toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveCount(0);
});

test('a plain flatpickr (without altInput) is focused without opening the calendar', async ({ page }) => {
    await page.goto('/tests/browser/flatpickr.html');
    await page.click('#submit-plain');

    await expect(page.locator('#plain')).toHaveClass(/is-invalid/);
    await expect(page.locator('#plain')).toBeFocused();
    await expect(page.locator('.flatpickr-calendar.open')).toHaveCount(0);
});
