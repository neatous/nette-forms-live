// Unit tests in jsdom: rendering and clearing of errors, radio lists, server-rendered errors, options. Layout-dependent
// behaviour (focus of visible controls, the pointer deferral) is covered by the browser tests in tests/browser.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Nette from 'nette-forms';
import NetteFormsLive from '../src/nette-forms-live.ts';

const rules = (list) => JSON.stringify(list);
const required = (msg) => rules([{ op: ':filled', msg }]);

const render = (html) => {
    document.body.innerHTML = html;

    return document.querySelector('form');
};

const feedback = (form) => Array.from(form.querySelectorAll('[data-nette-forms-live-feedback]')).map((el) => el.textContent);

describe('NetteFormsLive', () => {
    // jsdom has no layout: getClientRects() is empty (everything invisible) and scrollIntoView() is missing.
    const scrolled = [];
    const originalRects = Element.prototype.getClientRects;

    const layout = (visible) => {
        Element.prototype.getClientRects = function () {
            return visible(this) ? [{}] : [];
        };
    };

    beforeAll(() => {
        Element.prototype.scrollIntoView = function () {
            scrolled.push(this);
        };
        NetteFormsLive.install(Nette);
    });

    afterEach(() => {
        Element.prototype.getClientRects = originalRects;
        scrolled.length = 0;
    });

    beforeEach(() => {
        NetteFormsLive.install(Nette, {});
        document.body.innerHTML = '';
    });

    it('replaces showFormErrors of nette-forms', () => {
        expect(Nette.showFormErrors).not.toBe(undefined);

        const form = render(`<form><div><input name="a" data-nette-rules='${required('A is required')}'></div></form>`);

        expect(Nette.validateForm(form)).toBe(false);
        expect(feedback(form)).toEqual(['A is required']);

        const input = form.elements.namedItem('a');

        expect(input.classList.contains('is-invalid')).toBe(true);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')).toBe(form.querySelector('[data-nette-forms-live-feedback]').id);
    });

    it('renders all errors and clears them when the form becomes valid', () => {
        const form = render(`<form>
            <div><input name="a" data-nette-rules='${required('A')}'></div>
            <div><input name="b" data-nette-rules='${required('B')}'></div>
        </form>`);

        Nette.validateForm(form);
        expect(feedback(form)).toEqual(['A', 'B']);

        form.elements.namedItem('a').value = 'x';
        form.elements.namedItem('b').value = 'y';
        expect(Nette.validateForm(form)).toBe(true);
        expect(feedback(form)).toEqual([]);
        expect(form.querySelectorAll('.is-invalid')).toHaveLength(0);
        expect(form.elements.namedItem('a').hasAttribute('aria-describedby')).toBe(false);
    });

    it('is idempotent when validateForm runs twice for one submit', () => {
        const form = render(`<form><div><input name="a" data-nette-rules='${required('A')}'></div></form>`);

        Nette.validateForm(form);
        Nette.validateForm(form);
        expect(feedback(form)).toEqual(['A']);
    });

    it('places the message after the outermost input group', () => {
        const form = render(`<form>
            <div class="input-group has-validation"><div class="input-group">
                <span class="input-group-text">@</span><input name="a" data-nette-rules='${required('A')}'>
            </div></div>
        </form>`);

        Nette.validateForm(form);

        const message = form.querySelector('[data-nette-forms-live-feedback]');

        expect(message.parentElement.classList.contains('has-validation')).toBe(true);
        expect(message.classList.contains('d-block')).toBe(true);
    });

    it('shows one message for a radio list rendered item by item', () => {
        const radioRules = required('Pick one');
        const form = render(`<form><div class="group">
            <div class="form-check"><input type="radio" name="t" value="1" data-nette-rules='${radioRules}'></div>
            <div class="form-check"><input type="radio" name="t" value="2" data-nette-rules='${radioRules}'></div>
        </div></form>`);

        Nette.validateForm(form);

        expect(feedback(form)).toEqual(['Pick one']);
        expect(form.querySelector('.group > [data-nette-forms-live-feedback]')).not.toBe(null);
        expect(form.querySelectorAll('input.is-invalid')).toHaveLength(2);

        form.querySelector('input[value="2"]').checked = true;
        form.querySelector('input[value="2"]').dispatchEvent(new Event('change', { bubbles: true }));
        expect(feedback(form)).toEqual([]);
    });

    it('validates a changed control and re-validates dependent errors', () => {
        const equalRules = rules([{ op: ':equal', arg: { control: 'p1' }, msg: 'Passwords differ' }]);
        const form = render(`<form>
            <div><input name="p1"></div>
            <div><input name="p2" data-nette-rules='${equalRules}'></div>
        </form>`);

        form.elements.namedItem('p1').value = 'abc';
        form.elements.namedItem('p2').value = 'abd';
        form.elements.namedItem('p2').dispatchEvent(new Event('change', { bubbles: true }));
        expect(feedback(form)).toEqual(['Passwords differ']);

        form.elements.namedItem('p1').value = 'abd';
        form.elements.namedItem('p1').dispatchEvent(new Event('change', { bubbles: true }));
        expect(feedback(form)).toEqual([]);
    });

    it('keeps a server error until its own control changes', () => {
        const form = render(`<form>
            <div><input name="a" class="is-invalid"><div class="invalid-feedback d-block">Server says no</div></div>
            <div><input name="b"></div>
        </form>`);

        form.elements.namedItem('b').dispatchEvent(new Event('change', { bubbles: true }));
        expect(form.querySelector('.invalid-feedback').textContent).toBe('Server says no');

        form.elements.namedItem('a').dispatchEvent(new Event('change', { bubbles: true }));
        expect(form.querySelector('.invalid-feedback')).toBe(null);
        expect(form.elements.namedItem('a').classList.contains('is-invalid')).toBe(false);
    });

    it('leaves out controls matching the ignore option from live validation', () => {
        const form = render(`<form><div data-nette-forms-live="off">
            <input name="a" data-nette-rules='${required('A')}'>
        </div></form>`);

        form.elements.namedItem('a').dispatchEvent(new Event('change', { bubbles: true }));
        expect(feedback(form)).toEqual([]);

        Nette.validateForm(form);
        expect(feedback(form)).toEqual(['A']);
    });

    it('clears the errors on reset', () => {
        const form = render(`<form><div><input name="a" data-nette-rules='${required('A')}'></div></form>`);

        Nette.validateForm(form);
        form.reset();
        expect(feedback(form)).toEqual([]);
    });

    it('dispatches an event with the errors', () => {
        const form = render(`<form><div><input name="a" data-nette-rules='${required('A')}'></div></form>`);
        const events = [];

        document.addEventListener('nette-forms-live:errors', (event) => events.push(event.detail), { once: true });
        Nette.validateForm(form);

        expect(events).toHaveLength(1);
        expect(events[0].source).toBe('form');
        expect(events[0].errors[0].message).toBe('A');
    });

    it('applies the plain preset and custom classes', () => {
        NetteFormsLive.install(Nette, { preset: 'plain', classes: { invalid: 'bad' } });

        const form = render(`<form><div><input name="a" data-nette-rules='${required('A')}'></div></form>`);

        Nette.validateForm(form);

        expect(form.elements.namedItem('a').classList.contains('bad')).toBe(true);
        expect(form.querySelector('.form-error').textContent).toBe('A');
    });

    it('rejects an unknown preset', () => {
        expect(() => NetteFormsLive.install(Nette, { preset: 'bootstrap3' })).toThrow('unknown preset');
    });

    it('clears the errors of a form or of one control through clear()', () => {
        const form = render(`<form>
            <div><input name="a" data-nette-rules='${required('A')}'></div>
            <div><input name="b" data-nette-rules='${required('B')}'></div>
        </form>`);

        Nette.validateForm(form);
        NetteFormsLive.clear(form.elements.namedItem('a'));
        expect(feedback(form)).toEqual(['B']);

        NetteFormsLive.clear(form);
        expect(feedback(form)).toEqual([]);
    });

    it('shows given errors through showErrors() and skips elements that are not form controls', () => {
        const form = render(`<form><div><input name="a"></div><div id="note"></div></form>`);

        NetteFormsLive.showErrors(form, [
            { element: form.elements.namedItem('a'), message: 'From the page' },
            { element: form.querySelector('#note'), message: 'Not a control' },
        ]);

        expect(feedback(form)).toEqual(['From the page']);
    });

    it('removes a server error of a control without rules through handleChange()', () => {
        const form = render(`<form>
            <div><select name="s" class="is-invalid"><option>1</option></select><div class="invalid-feedback">Server</div></div>
        </form>`);

        NetteFormsLive.handleChange(form.elements.namedItem('s'));

        expect(form.querySelector('.invalid-feedback')).toBe(null);
    });

    it('empties and hides server messages with serverFeedback: empty', () => {
        NetteFormsLive.install(Nette, { serverFeedback: 'empty' });

        const form = render(`<form>
            <div><input name="a" class="is-invalid"><div class="invalid-feedback d-block">Server</div></div>
        </form>`);

        form.elements.namedItem('a').dispatchEvent(new Event('change', { bubbles: true }));

        const message = form.querySelector('.invalid-feedback');

        expect(message.textContent).toBe('');
        expect(message.hidden).toBe(true);
        expect(message.classList.contains('d-block')).toBe(false);
    });

    it('shows one message for a checkbox list rendered at once', () => {
        const form = render(`<form><div class="group">
            <div class="form-check"><input type="checkbox" name="c[]" value="1" data-nette-rules='${required('Pick some')}'></div>
            <div class="form-check"><input type="checkbox" name="c[]" value="2"></div>
        </div></form>`);

        Nette.validateForm(form);

        expect(feedback(form)).toEqual(['Pick some']);
        expect(form.querySelectorAll('input.is-invalid')).toHaveLength(2);
    });

    it('places a checkbox message inside its .custom-control with the bootstrap4 preset', () => {
        NetteFormsLive.install(Nette, { preset: 'bootstrap4' });

        const form = render(`<form><div class="custom-control">
            <input type="checkbox" name="agree" data-nette-rules='${required('Agree')}'>
        </div></form>`);

        Nette.validateForm(form);

        expect(form.querySelector('.custom-control > [data-nette-forms-live-feedback]').textContent).toBe('Agree');
    });

    it('focuses the first error, unless focusFirstError is false', () => {
        // jsdom has no layout, so every element would count as invisible.
        const original = Element.prototype.getClientRects;
        Element.prototype.getClientRects = () => [{}];

        try {
            const html = `<form><div><input name="a" data-nette-rules='${required('A')}'></div></form>`;

            let form = render(html);
            Nette.validateForm(form);
            expect(document.activeElement).toBe(form.elements.namedItem('a'));

            NetteFormsLive.install(Nette, { focusFirstError: false });
            form = render(html);
            Nette.validateForm(form);
            expect(document.activeElement).toBe(document.body);
        } finally {
            Element.prototype.getClientRects = original;
        }
    });

    it('keeps errors given to showErrors() when another field changes', () => {
        const form = render(`<form>
            <div><input name="a" data-nette-rules='${required('A')}' value="filled"></div>
            <div><input name="b"></div>
        </form>`);

        NetteFormsLive.showErrors(form, [{ element: form.elements.namedItem('a'), message: 'Taken' }]);
        form.elements.namedItem('b').dispatchEvent(new Event('change', { bubbles: true }));

        expect(feedback(form)).toEqual(['Taken']);
    });

    it('marks a control without a message when the error has no text', () => {
        const form = render(`<form><div><input name="a"></div></form>`);

        NetteFormsLive.showErrors(form, [{ element: form.elements.namedItem('a'), message: '' }]);

        expect(form.elements.namedItem('a').classList.contains('is-invalid')).toBe(true);
        expect(feedback(form)).toEqual([]);
    });

    it('marks the elements of a widget and lets a built-in adapter be switched off', () => {
        const fakeTomSelect = (select) => {
            const wrapper = document.createElement('div');
            const input = document.createElement('input');

            wrapper.className = 'ts-wrapper';
            wrapper.appendChild(input);
            select.after(wrapper);
            select.tomselect = { wrapper, focus_node: input, settings: { openOnFocus: true }, focus() {} };

            return wrapper;
        };
        const html = `<form><div><select name="s" data-nette-rules='${required('S')}'><option value="">-</option></select></div></form>`;

        let form = render(html);
        let wrapper = fakeTomSelect(form.elements.namedItem('s'));
        Nette.validateForm(form);
        expect(wrapper.classList.contains('is-invalid')).toBe(true);

        NetteFormsLive.install(Nette, { widgets: { tomSelect: false } });
        form = render(html);
        wrapper = fakeTomSelect(form.elements.namedItem('s'));
        Nette.validateForm(form);
        expect(wrapper.classList.contains('is-invalid')).toBe(false);
        expect(form.elements.namedItem('s').classList.contains('is-invalid')).toBe(true);
    });

    it('marks and focuses the elements of a custom widget adapter', () => {
        layout((element) => element.classList.contains('fancy'));

        NetteFormsLive.install(Nette, {
            widgets: {
                fancy: {
                    elements: (control) => (control.nextElementSibling?.classList.contains('fancy') ? [control.nextElementSibling] : []),
                },
            },
        });

        const form = render(`<form><div>
            <input type="hidden" name="a" data-nette-rules='${required('A')}'><button type="button" class="fancy">pick</button>
        </div></form>`);

        Nette.validateForm(form);

        expect(form.querySelector('.fancy').classList.contains('is-invalid')).toBe(true);
        expect(document.activeElement).toBe(form.querySelector('.fancy'));
    });

    it('dispatches the event before the focus, with the hidden controls, so a handler can reveal them', () => {
        layout((element) => !element.closest('[data-hidden]'));

        const form = render(`<form>
            <div data-hidden><input name="a" data-nette-rules='${required('A')}'></div>
        </form>`);
        let hidden = null;
        const reveal = (event) => {
            hidden = event.detail.hidden.map((control) => control.name);
            form.querySelector('[data-hidden]').removeAttribute('data-hidden');
        };

        document.addEventListener('nette-forms-live:errors', reveal, { once: true });
        Nette.validateForm(form);

        expect(hidden).toEqual(['a']);
        expect(document.activeElement).toBe(form.elements.namedItem('a'));
        expect(scrolled[0]).toBe(form.elements.namedItem('a'));
    });

    it('lists errors that cannot be shown at a visible control in the summary container', () => {
        layout((element) => !element.closest('[data-hidden]'));
        NetteFormsLive.install(Nette, { summaryContainer: (form) => form.querySelector('.summary') });

        const form = render(`<form>
            <div class="summary"></div>
            <div data-hidden><input name="a" data-nette-rules='${required('Hidden A')}'></div>
        </form>`);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        Nette.validateForm(form);

        expect(form.querySelector('.summary [role="alert"] li').textContent).toBe('Hidden A');
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();

        form.elements.namedItem('a').value = 'x';
        Nette.validateForm(form);
        expect(form.querySelector('.summary [role="alert"]')).toBe(null);
    });

    it('announces a text from the announce option in a polite live region', async () => {
        NetteFormsLive.install(Nette, { announce: ({ errors }) => `${errors.length} errors` });

        const form = render(`<form>
            <div><input name="a" data-nette-rules='${required('A')}'></div>
            <div><input name="b" data-nette-rules='${required('B')}'></div>
        </form>`);

        Nette.validateForm(form);
        await new Promise((resolve) => setTimeout(resolve, 80));

        expect(document.querySelector('[role="status"][aria-live="polite"]').textContent).toBe('2 errors');
    });

    it('focuses a server-rendered error through focusFirstError()', () => {
        layout(() => true);

        render(`<form><div><input name="a"></div><div><input name="b" class="is-invalid"></div></form>`);

        expect(NetteFormsLive.focusFirstError()).toBe(true);
        expect(document.activeElement.name).toBe('b');
    });

    it('renders messages as text, not HTML', () => {
        const form = render(`<form><div><input name="a" data-nette-rules='${required('<b>A</b>')}'></div></form>`);

        Nette.validateForm(form);

        expect(form.querySelector('b')).toBe(null);
        expect(feedback(form)).toEqual(['<b>A</b>']);
    });
});
