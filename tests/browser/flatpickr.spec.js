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

// With validateOn.blur 'always', clicking the arrow of the open calendar blurs the altInput; the user is still picking.
// The postponed validation runs in a later task, so the negative assertions wait a moment first.
for (const [name, selector] of [['editable', '#date + input'], ['read-only', '#ro + input']]) {
    test(`blur always does not validate the ${name} flatpickr alt input while the calendar is used`, async ({ page, hasTouch }) => {
        await page.goto('/tests/browser/flatpickr-always.html');

        const altInput = page.locator(selector);
        const month = () => page.evaluate((id) => document.getElementById(id)._flatpickr.currentMonth, selector.slice(1, selector.indexOf(' ')));

        await altInput.click();
        await expect(page.locator('.flatpickr-calendar.open')).toHaveCount(1);

        const before = await month();

        await page.locator('.flatpickr-calendar.open .flatpickr-next-month').click();
        await expect.poll(month).not.toBe(before);
        await expect(page.locator('.flatpickr-calendar.open')).toHaveCount(1);
        await page.waitForTimeout(100);
        await expect(altInput).not.toHaveClass(/is-invalid/);

        // On a touch device flatpickr closes the calendar on touchstart, which click() does not dispatch.
        await (hasTouch ? page.locator('#outside').tap() : page.locator('#outside').click());
        await expect(page.locator('.flatpickr-calendar.open')).toHaveCount(0);
        await page.waitForTimeout(100);
        await expect(altInput).not.toHaveClass(/is-invalid/);
        await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveCount(0);
    });
}

test('a read-only flatpickr alt input shows the error on submit and clears it after picking a day', async ({ page }) => {
    await page.goto('/tests/browser/flatpickr-always.html');
    await page.click('#submit-ro');

    const altInput = page.locator('#ro + input');

    await expect(altInput).toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveText('Choose a read-only date');

    await altInput.click();
    await page.locator('.flatpickr-calendar.open .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay)').first().click();

    await expect(altInput).not.toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveCount(0);
});

test('blur always validates the flatpickr alt input left after typing into it', async ({ page }) => {
    await page.goto('/tests/browser/flatpickr-always.html');

    const altInput = page.locator('#date + input');

    await altInput.click();
    await page.keyboard.type('x');
    await page.keyboard.press('Backspace');
    await page.locator('#note').focus();

    await expect(altInput).toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveText('Choose a date');
});

test('blur always still validates a plain text input left untouched', async ({ page }) => {
    await page.goto('/tests/browser/flatpickr-always.html');
    await page.locator('#name').focus();
    await page.locator('#note').focus();

    await expect(page.locator('#name')).toHaveClass(/is-invalid/);
    await expect(page.locator('[data-nette-forms-live-feedback]')).toHaveText('Name is required');
});
