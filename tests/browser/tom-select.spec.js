// Tom Select is supported out of the box: the visible .ts-wrapper is marked, the focus goes to Tom Select, and its
// native change event validates the select again.
import { expect, test } from '@playwright/test';

test('a Tom Select error is shown on the wrapper and clears after a choice', async ({ page }) => {
    await page.goto('/tests/browser/tom-select.html');
    await page.click('#submit');

    const wrapper = page.locator('.ts-wrapper');

    await expect(wrapper).toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveText('Choose a color');
    expect(await page.evaluate(() => document.querySelector('.ts-wrapper').contains(document.activeElement))).toBe(true);
    // Focusing the error does not open the dropdown.
    await expect(wrapper).not.toHaveClass(/dropdown-active/);

    await page.evaluate(() => document.getElementById('color').tomselect.setValue('blue'));

    await expect(wrapper).not.toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveCount(0);
});

test('typing into the Tom Select search and leaving it does not validate the select', async ({ page }) => {
    await page.goto('/tests/browser/tom-select.html');
    await page.locator('.ts-control').click();
    await page.keyboard.type('re');
    await page.keyboard.press('Tab');

    await expect(page.locator('.ts-wrapper')).not.toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveCount(0);
});
