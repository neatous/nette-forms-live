# Nette Forms Live: usage guide

The [README](../README.md) describes the installation, the options and the API. This guide shows how to use them.

## How it works

1. Your PHP form defines the rules (`setRequired()`, `addRule()`). Nette renders them into the `data-nette-rules`
   attribute of each field.
2. `netteForms.js` (nette-forms) checks those rules in the browser.
3. This library decides when a field is checked and shows the result in the page.

The server still validates every submit. The library does not define rules and does not replace the server validation.

The examples use `Nette`, the global variable of the script-tag setup. With a bundler, pass the imported `netteForms`
in its place.

## Loading order

Load `netteForms.js` first, then the library, and then call `install()`. Take `netteForms.js` from the installed
`nette/forms` package, so the rules in the browser match the ones on the server.

With gulp, keep that order in the concatenated bundle:

```js
src([
    './vendor/nette/forms/src/assets/netteForms.js',
    './node_modules/@neatous/nette-forms-live/dist/nette-forms-live.min.js',
    './node_modules/naja/dist/Naja.js',
    './assets/js/init.js', // calls NetteFormsLive.install(Nette) at the top level
])
```

Call `install()` at the top level of your script, not in a `DOMContentLoaded` or `load` handler. A form submitted
before `install()` runs shows its errors in the dialog of nette-forms.

## Markup

With the default `bootstrap5` preset, the library adds the class `is-invalid` to the field. It appends the message to
the element from the table below:

```html
<div class="invalid-feedback d-block">This field is required.</div>
```

| Field | The message is appended to |
| --- | --- |
| Input, select, textarea | the parent element of the field |
| Field in an `.input-group` | the outermost `.input-group` |
| Single checkbox | its `.form-check` |
| Radio list, checkbox list | the parent of the first `.form-check` |

```latte
<form n:name="form">
    {* input *}
    <div class="mb-3">
        <label n:name="email" class="form-label">E-mail</label>
        <input n:name="email" class="form-control">
    </div>

    {* input group: .has-validation keeps the rounded corners *}
    <div class="input-group has-validation mb-3">
        <span class="input-group-text">@</span>
        <input n:name="username" class="form-control">
    </div>

    {* radio list: the wrapper holds only the list; the message goes to its end *}
    <div class="mb-3">
        {foreach $form[type]->getItems() as $key => $label}
            <div class="form-check">
                <input n:name="type:$key" class="form-check-input">
                <label n:name="type:$key" class="form-check-label">{$label}</label>
            </div>
        {/foreach}
    </div>

    {* checkbox *}
    <div class="form-check mb-3">
        <input n:name="agree" class="form-check-input">
        <label n:name="agree" class="form-check-label">I agree</label>
    </div>

    <button n:name="save" class="btn btn-primary">Save</button>
</form>
```

A radio or checkbox list gets one message, and every item is marked.

Do not write `novalidate` on the form. If you do, nette-forms does not validate the form on submit.

## What the user sees

| The user | Result |
| --- | --- |
| Changes a select, checkbox or radio | The field is validated at once. |
| Leaves a text field after editing it | The field is validated. |
| Types into a text field without an error | Nothing happens. Typing never shows a new error. |
| Types into a text field that shows an error | The field is rechecked on every keystroke. The error goes away as soon as the value is valid. |
| Tabs through fields without editing them | Nothing happens. |
| Changes a field that another error depends on, such as the first of two passwords | The dependent errors are checked again. |
| Clicks Save right after editing a field | The field is validated after the click, so a new message does not move the button away from the pointer. |
| Submits an invalid form | All errors are shown. The first visible field with an error gets the focus and is scrolled to the middle of the screen with its message. Dropdowns and calendars stay closed. |
| Enters an unparsable number or date, such as letters in a number field | The error is shown in the form, not in a browser bubble. |
| Resets the form | All errors are removed. |

Disabled fields are not validated.

## Naja and AJAX

Forms in snippets and modals need no initialisation:

```latte
{snippet form}
    <form n:name="form" class="ajax">
        ...
    </form>
{/snippet}
```

### Focusing errors rendered by the server

The library does not focus errors that the server rendered into a snippet. Focus them after the update:

```js
naja.snippetHandler.addEventListener('afterUpdate', (event) => {
    NetteFormsLive.focusFirstError(event.detail.snippet);
});
```

### The clicked button is not sent in older browsers

The library does not cause this problem, but it shows up in the same forms. Naja 3.2 and later passes the clicked
button to `FormData` as a second argument. Chrome before 112, Firefox before 111 and Safari before 16.4 ignore that
argument, so the button is not sent and the server cannot tell which button submitted the form. If you support those
browsers, load this polyfill before Naja:

```js
(function () {
    const Native = window.FormData;
    const form = document.createElement('form');
    const button = Object.assign(document.createElement('button'), { name: 'b', value: '1' });
    form.appendChild(button);

    if (new Native(form, button).get('b') === '1') {
        return; // the browser supports the second argument
    }

    window.FormData = class extends Native {
        constructor(form, submitter) {
            super(form);
            if (form && submitter && submitter.name && !submitter.disabled && submitter.type !== 'image') {
                this.append(submitter.name, submitter.value || '');
            }
        }
    };
})();
```

## Widgets

Tom Select, select2 and flatpickr hide the real field and show their own elements. The built-in adapters mark those
elements as invalid, focus them without opening them and pass their events on to the real field. All three are on by
default.

### select2

select2 reports a change only as a jQuery event, which the library cannot hear. Pass the event on with one handler
for the whole page:

```js
$(document).on('change', 'select.select2-hidden-accessible', function () {
    NetteFormsLive.handleChange(this);
});
```

The toggles of nette-forms (`addCondition()->toggle()`) do not hear the jQuery event either. If the form uses them,
extend the handler:

```js
$(document).on('change', 'select.select2-hidden-accessible', function (event) {
    Nette.toggleForm(this.form, event); // always pass the event
    NetteFormsLive.handleChange(this);
});
```

### Tom Select

No bridge is needed. Typing into the search box of Tom Select does not count as an edit of the field.

The Bootstrap 5 theme of Tom Select colours an invalid select with the CSS variable `--bs-form-invalid-color`, which
Bootstrap has only since version 5.3. With Bootstrap 5.2 or older, or for a clearly red border, add your own rule:

```css
.ts-wrapper.is-invalid .ts-control {
    border-color: var(--bs-form-invalid-border-color, #dc3545);
}
```

### flatpickr

No bridge is needed. With `altInput: true`, and on touch devices, the library marks and focuses the visible input in
place of the hidden original.

flatpickr opens on focus, so the library closes the calendar again at once. Your `onOpen` and `onClose` hooks run once
when that happens.

### Switching an adapter off

```js
NetteFormsLive.install(Nette, { widgets: { select2: false } });
```

The library then marks only the hidden original field.

### Your own widget

An adapter is an object with one required function, `elements`. The library calls the functions for every field, so
each must first check that the field belongs to your widget.

```js
const pickerOf = (control) => {
    const picker = control.nextElementSibling;

    return picker?.classList.contains('color-picker') ? picker : null;
};

NetteFormsLive.install(Nette, {
    widgets: {
        colorPicker: {
            // the visible elements of the widget; [] when the field is not this widget
            elements: (control) => (pickerOf(control) ? [pickerOf(control)] : []),
            // optional: focus the widget; return false when the field is not this widget
            focus: (control, { open }) => {
                const picker = pickerOf(control);

                if (!picker) {
                    return false;
                }

                picker.querySelector('button').focus({ preventScroll: true }); // open it only if `open` is true

                return true;
            },
            // optional: the real field that an element of the widget belongs to, or null
            originalOf: (element) => element.closest('.color-picker')?.previousElementSibling ?? null,
            // optional: set to false when the widget's own input is a search box, not the value
            inputEditsValue: true,
        },
    },
});
```

You can wrap a built-in adapter. All three are in `NetteFormsLive.widgets`.

## Errors rendered by the server

Render them with the same classes. The message must be a direct child of the element from the table in
[Markup](#markup).

```latte
<div class="mb-3">
    <label n:name="email" class="form-label">E-mail</label>
    <input n:name="email" n:class="form-control, $form[email]->hasErrors() ? is-invalid">
    <div n:foreach="$form[email]->getErrors() as $error" class="invalid-feedback d-block">{$error}</div>
</div>
```

A server error stays until the user edits that field or submits the form. Editing another field does not remove it.
If several fields share the parent element, the server messages of all of them are removed together, so give each
field its own wrapper.

By default, the message element is removed from the page. This option keeps it, emptied and hidden:

```js
NetteFormsLive.install(Nette, { serverFeedback: 'empty' });
```

## Turning things off

Put `data-nette-forms-live="off"` on a field or on any ancestor, including the form, to turn live validation off there.
The errors of a submit are still shown.

```latte
<input n:name="code" class="form-control" data-nette-forms-live="off">

<form n:name="searchForm" data-nette-forms-live="off">...</form>
```

For a radio list, put the attribute on the wrapper of the whole list. The `ignore` option sets another selector.

| To stop | Set |
| --- | --- |
| focusing the first error after a submit | `focusFirstError: false` |
| scrolling to the focused error | `scrollToError: false` |
| validating on change | `validateOn: { change: false }` |
| validating when a text field is left | `validateOn: { blur: false }` |
| rechecking while the user types | `validateOn: { input: false }` |
| using a built-in widget adapter | `widgets: { tomSelect: false }` |

To let the focus open a widget (a dropdown or a calendar), set `focusOpensWidget: true`.

The keys that you leave out of `validateOn`, `classes` and `widgets` keep their defaults.

## Other markup

### Presets

```js
NetteFormsLive.install(Nette, { preset: 'bootstrap4' }); // also understands .custom-control
NetteFormsLive.install(Nette, { preset: 'plain' });
```

The `plain` preset adds the class `is-invalid` to the field and appends a `div` with the class `form-error` to its
parent. For a radio or checkbox list, it appends the message to the grandparent of the first item.

### Custom classes

Your classes replace those of the preset. Separate several classes with spaces.

```js
NetteFormsLive.install(Nette, {
    preset: 'plain',
    classes: { invalid: 'input--error', feedback: 'field__error' },
});
```

### Custom place for the message

The `feedbackContainer` function returns the element the message is appended to, or `null` for no message.

```latte
<input n:name="email">
...
<div data-error-for="email"></div>
```

```js
NetteFormsLive.install(Nette, {
    feedbackContainer: (control) =>
        control.form.querySelector(`[data-error-for="${CSS.escape(control.name)}"]`) || control.parentElement,
});
```

### Custom marked elements

The `markTargets` function returns the elements that get the invalid class, `aria-invalid` and `aria-describedby`.
The elements of widgets are added automatically.

```js
NetteFormsLive.install(Nette, {
    markTargets: (control) => [
        ...NetteFormsLive.presets.bootstrap5.markTargets(control), // the field, or all items of a list
        control.closest('.field'),                                  // plus the wrapper
    ].filter(Boolean),
});
```

## Message for an unparsable number or date

The browser cannot read some values, for example letters in a number field. The library then shows the message of the
rule that fails, such as the one of `addInteger()`. When no rule fails, it shows the browser's own message, which is
in the language of the browser. Set `badInputMessage` to use your text, for example from a data attribute filled by
the PHP translator:

```js
NetteFormsLive.install(Nette, {
    badInputMessage: (control) => control.dataset.badInputMessage ?? 'Please enter a valid value.',
});
```

## Reacting to errors

The library dispatches the event `nette-forms-live:errors` after every validation. The README describes its
[`detail`](../README.md#api). After a submit, the event comes before the focus, so a handler can reveal a hidden
field and the library then focuses it.

This handler opens the Bootstrap tab that contains the first error:

```js
document.addEventListener('nette-forms-live:errors', (event) => {
    const { errors, hidden, source } = event.detail;
    const first = errors[0]?.element;

    if (source !== 'form' || !hidden.includes(first)) {
        return; // no error, or the first one is visible
    }

    const pane = first.closest('.tab-pane');
    const trigger = pane && document.querySelector(`[data-bs-toggle="tab"][data-bs-target="#${pane.id}"]`);

    if (trigger) {
        pane.classList.remove('fade'); // no fade: the focused field is visible at once
        bootstrap.Tab.getOrCreateInstance(trigger).show();
    }
});
```

## Accessibility

- The library sets `aria-invalid` and `aria-describedby` with the error, so a screen reader reads the message with the
  field.
- Wrap a radio list in a `<fieldset>` with a `<legend>`. `aria-invalid` has no meaning on a single radio.
- Give server-rendered messages an `id` and point `aria-describedby` of the field to it in your template.

After a submit, a screen reader reads only the focused field. To announce more, return a text from `announce`; the
library writes it into a visually hidden live region.

```js
NetteFormsLive.install(Nette, {
    announce: ({ errors, source }) => (source === 'form' && errors.length ? `The form has ${errors.length} errors.` : null),
});
```

Some errors have no visible field: errors of a hidden field, or of the form itself. To list them after a submit, give
the library a container. The list has `role="alert"`.

```latte
<form n:name="form">
    <div class="form-errors"></div>
    ...
</form>
```

```js
NetteFormsLive.install(Nette, { summaryContainer: (form) => form.querySelector('.form-errors') });
```

The list is rebuilt on every submit. An error fixed in the meantime stays listed until then.

## Migrating from live-form-validation

1. Remove the `live-form-validation.js` script. It contains its own copy of nette-forms, so load `netteForms.js`
   from the `nette/forms` package in its place.
2. Remove all `LiveForm` calls, such as `LiveForm.setOptions()`.
3. Remove the CSS written for its classes, such as `has-error`, `has-success` and `help-block`.
4. Remove the `data-lfv-message-id` attributes and the elements they point to. If you need a fixed place for the
   message, use `feedbackContainer`.
5. Replace the class that turned live validation off:

   ```diff
   -<input n:name="code" class="form-control no-live-validation">
   +<input n:name="code" class="form-control" data-nette-forms-live="off">
   ```

The behaviour differs in these points:

- A field is not validated on every keystroke, only when it is changed or left after editing. Typing rechecks only a
  field that already shows an error.
- Valid fields are not marked, so there is no green state.
- The message is plain text with no prefix.
- The rules are checked by the `netteForms.js` script of your installed `nette/forms`, not by a bundled copy.

## Troubleshooting

**The nette-forms dialog appears instead of errors in the page.**
`install()` did not run before the submit, or it got another copy of nette-forms than the one that validates the
form. Call `NetteFormsLive.install(Nette)` right after `netteForms.js` and load nette-forms only once.

**Nothing is validated in a form added by JavaScript.**
Check that its fields have `data-nette-rules` (the HTML must be rendered by the Nette form) and that no ancestor has
`data-nette-forms-live="off"`. Naja initialises the forms in its snippets. For a form you insert yourself, call
`Nette.initForm(form)`; without it the submit is not validated.

**A select2 field is not validated when changed.**
The bridge is missing. See [select2](#select2).

**The message is in the wrong place.**
It is appended to the element from the table in [Markup](#markup). Wrap the field, or the whole radio list, in its own
element, or set `feedbackContainer`.

**The message is in the page but not visible.**
Your CSS hides the message class. Set `classes.feedbackVisible` to a class that shows it.

**The first click on Save is lost.**
The library validates a field only after the click, so it does not move the button. Look for your own `blur` or
`change` handlers that change the layout while the button is pressed.
