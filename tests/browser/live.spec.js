// Browser tests of the behaviour that depends on real layout, focus and event order, in Chromium, Firefox and WebKit.
import { expect, test } from '@playwright/test';

const messages = (page) => page.locator('[data-nette-forms-live-feedback]').allTextContents();
const submits = (page) => page.evaluate(() => window.submits);

test.beforeEach(async ({ page }) => {
    await page.goto('/tests/browser/fixture.html');
});

test('submit shows all errors and focuses the first control', async ({ page }) => {
    await page.click('#submit');

    expect(await messages(page)).toEqual(['E-mail is required', 'Name is required', 'Amount is required']);
    await expect(page.locator('#email')).toBeFocused();
    expect(await submits(page)).toBe(0);
});

test('tabbing through untouched controls shows no error', async ({ page }) => {
    await page.focus('#email');
    for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab');
    }

    await expect(page.locator('#note')).toBeFocused();
    expect(await messages(page)).toEqual([]);
});

test('typing hides the error and leaving an edited control validates it', async ({ page }) => {
    await page.click('#submit');
    await page.fill('#email', 'abc');
    expect(await messages(page)).not.toContain('E-mail is required');

    await page.focus('#note');
    expect(await messages(page)).toContain('E-mail is not valid');
});

test('the first click on submit is not lost when leaving a field removes a message above the button', async ({ page }) => {
    await page.fill('#email', 'one@example.com');
    await page.fill('#confirm', 'two@example.com');
    await page.fill('#name', 'Name');
    await page.fill('#amount', '5');
    await page.click('#submit');
    expect(await messages(page)).toEqual(['The e-mails differ']);

    // Fixing the e-mail while it keeps the focus: the click blurs it, its change makes the confirmation valid, and the
    // removed message would move the button up between the press and the release.
    await page.fill('#email', 'two@example.com');
    await page.click('#submit');

    expect(await submits(page)).toBe(1);
    expect(await messages(page)).toEqual([]);
});

test('nothing moves while the submit button is pressed', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse press only');

    await page.fill('#email', 'abc');
    const before = await page.locator('#submit').boundingBox();

    await page.locator('#submit').hover();
    await page.mouse.down();
    expect((await page.locator('#submit').boundingBox()).y).toBe(before.y);
    expect(await messages(page)).toEqual([]);
    await page.mouse.up();
});

test('an unparsable number is reported in the form, not in the browser bubble', async ({ page }) => {
    await page.fill('#email', 'user@example.com');
    await page.fill('#name', 'Name');
    await page.focus('#amount');
    await page.keyboard.type('1e');

    const badInput = await page.evaluate(() => document.getElementById('amount').validity.badInput);
    test.skip(!badInput, 'this browser accepts the value without badInput');

    // Enter submits without leaving the field, so only the handling of the "invalid" event can render the message.
    await page.keyboard.press('Enter');

    await expect.poll(() => page.evaluate(() => window.invalidPrevented)).toBe(true);
    expect(await messages(page)).toEqual(['Enter a valid number']);
    expect(await submits(page)).toBe(0);
});

test('while a field shows an error, typing rechecks it and removes the error once valid', async ({ page }) => {
    await page.click('#submit');
    await page.focus('#email');

    await page.keyboard.type('user');
    expect(await messages(page)).toContain('E-mail is not valid');

    await page.keyboard.type('@example.com');
    expect(await messages(page)).not.toContain('E-mail is not valid');
    await expect(page.locator('#email')).toBeFocused();

    // A field without an error gets none while typing.
    await page.focus('#note');
    await page.keyboard.type('x');
    expect(await messages(page)).not.toContain('E-mail is not valid');
});
