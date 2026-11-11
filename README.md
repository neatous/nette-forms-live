<h1 align="center">
    <img src="docs/img/neatous.png" alt="Logo" height="120" />
    <br/>
    Nette Forms Live
</h1>
<p align="center">
    Extends <a href="https://github.com/nette/forms">nette-forms</a> with error messages next to the fields and live validation of Nette forms.
    <br/>
    It also focuses the first error and supports Tom Select, select2 and flatpickr.
    <br/>
    <sub>It is not part of the Nette Framework and is not affiliated with its authors.</sub>
</p>
<p align="center">
    <a href="https://github.com/neatous/nette-forms-live/actions/workflows/ci.yml"><img src="https://github.com/neatous/nette-forms-live/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/neatous/nette-forms-live" alt="License"></a>
</p>

On its own, nette-forms (`netteForms.js`) checks a form only on submit and lists the errors in a dialog. With this
library, nette-forms still checks the rules; the library decides when a field is checked and where its error is shown.

- **Errors next to the fields.** The library uses Bootstrap 5 markup by default and has presets for Bootstrap 4 and
  plain markup.
- **Live validation.** A field is validated when the user changes it or leaves it after editing. While it shows an
  error, it is rechecked on every keystroke. A field the user only tabbed through shows no error.
- **Focus on the first error.** After a submit, the first field with an error gets the focus and is scrolled into
  view with its message.
- **Dependent errors.** An error that depends on another field, such as a repeated password, is checked again when
  that field changes.
- **Widgets.** Adapters for Tom Select, select2 and flatpickr are built in, and you can add your own.
- **Server-rendered errors.** They stay until their field is edited or the form is submitted again.
- **Accessibility.** The library sets `aria-invalid` and `aria-describedby`. A screen reader announcement and an
  error summary are optional.

The library needs neither jQuery nor any other dependency. Its listeners are on `document`, so forms added later
(Naja snippets, modals) work without initialisation.

## Requirements

- The library needs nette-forms 3.5 or a later 3.x version. This is the `netteForms.js` script that comes with
  recent 3.2 releases of the `nette/forms` Composer package, in its `src/assets` folder.
- The supported browsers are Chrome and Edge 85+, Firefox 90+, Safari and iOS 15+, and Samsung Internet 14+.

## Installation

The package is not on npm yet. Install it from GitHub:

```sh
yarn add @neatous/nette-forms-live@github:neatous/nette-forms-live#master
# or
npm install github:neatous/nette-forms-live#master
```

The built files are part of the repository, so nothing is built on installation. The lock file pins the installed
commit. To move to the latest one, run:

```sh
yarn upgrade @neatous/nette-forms-live
# or
npm update @neatous/nette-forms-live
```

Without a package manager, download the built file and put it in the public folder of your project. Take it from
[`dist/nette-forms-live.min.js`](https://github.com/neatous/nette-forms-live/blob/master/dist/nette-forms-live.min.js)
on GitHub ("Download raw file"), or load it from jsDelivr, which serves files straight from GitHub:

```html
<script src="https://cdn.jsdelivr.net/gh/neatous/nette-forms-live@master/dist/nette-forms-live.min.js"></script>
```

Once a version is released, replace `master` with its tag (for example `@v0.1.0`), so the file does not change
unexpectedly.

### With script tags or file concatenation

Load nette-forms first, then the library, then call `install()`. Both files have to be in the public folder of your
project (copied there, for example, by your build); the paths below are only an example.

```html
<!-- nette-forms: the client script of Nette Forms -->
<script src="/netteForms.min.js"></script>

<!-- this library -->
<script src="/nette-forms-live.min.js"></script>

<!-- initialisation: hook the library into nette-forms -->
<script>NetteFormsLive.install(Nette);</script>
```

### With a bundler (Vite, esbuild, webpack)

Install the `nette-forms` npm package too. Use the version that your `nette/forms` Composer package ships.

```js
import netteForms from 'nette-forms';
import NetteFormsLive from '@neatous/nette-forms-live';

NetteFormsLive.install(netteForms);
netteForms.initOnLoad();   // an imported nette-forms does not initialise itself
window.Nette = netteForms; // Naja looks for window.Nette
```

Call `install()` right after nette-forms is loaded. Until it runs, nette-forms shows the errors in its dialog.

Examples for markup, widgets, Naja and custom options are in the
[usage guide](https://github.com/neatous/nette-forms-live/blob/master/docs/usage.md).

## Options

Pass the options as the second argument of `install()`. All of them are optional. The API calls a form field
a *control*, as Nette does.

```js
NetteFormsLive.install(Nette, { scrollToError: 'nearest' });
```

| Option | Default | Meaning |
| --- | --- | --- |
| `preset` | `'bootstrap5'` | The name of a preset (`'bootstrap5'`, `'bootstrap4'`, `'plain'`) or your own preset object. |
| `classes.invalid` | `'is-invalid'` | The class of an invalid field. |
| `classes.feedback` | `'invalid-feedback'` | The class of a message. Server-rendered messages are recognised by it. |
| `classes.feedbackVisible` | `'d-block'` | An extra class that makes a message visible. |
| `feedbackContainer` | from the preset | A function `(control) => Element \| null`. It returns the element the message is appended to, or `null` for no message. |
| `markTargets` | from the preset | A function `(control) => Element[]`. It returns the elements that get the invalid class and the ARIA attributes. Widget elements are added automatically. |
| `widgets` | all three built-in adapters on | Set `tomSelect`, `select2` or `flatpickr` to `false` to switch the adapter off. An object under another key adds your own adapter. |
| `ignore` | `'[data-nette-forms-live="off"]'` | A selector of fields, or of their ancestors, that are not validated live. The errors of a submit are still shown. |
| `validateOn.change` | `true` | Validates a field when it is changed. |
| `validateOn.blur` | `'dirty'` | Validates a text field when the user leaves it: `'dirty'` only after an edit, `'always'` every time, `false` never. |
| `validateOn.input` | `'recheck'` | Says what typing does to a field that shows an error: `'recheck'` validates it again, `'clear'` hides the error, `false` does nothing. Typing never shows a new error. |
| `focusFirstError` | `true` | Focuses the first visible field with an error after a submit. |
| `focusOpensWidget` | `false` | Allows that focus to open a widget (a Tom Select dropdown, a flatpickr calendar). |
| `scrollToError` | `'center'` | Scrolls the focused field to the `'center'` of the screen or to its `'nearest'` edge. `false` turns scrolling off. |
| `serverFeedback` | `'remove'` | Says what happens to a server-rendered message when its error is removed: `'remove'` deletes the element, `'empty'` empties and hides it. |
| `badInputMessage` | `null` | The message for an unparsable number or date when no rule fails. It is a string or a function `(control) => string`. With `null`, the browser's message is used, in the browser's language. |
| `summaryContainer` | `null` | A function `(form) => Element \| null`. It returns the element in which the errors without a visible field are listed after a submit. |
| `announce` | `null` | A function `({ errors, source, form }) => string \| null`. It returns the text that screen readers read after a validation. |

Separate several classes with spaces. The `plain` preset uses the classes `is-invalid` and `form-error` and has no
`feedbackVisible` class. A preset object has the keys `classes`, `feedbackContainer` and `markTargets`.

## API

With script tags, the API is the global `NetteFormsLive` object. With a bundler, it is the default export, and the
functions are also named exports.

| Call | Does |
| --- | --- |
| `install(netteForms, options?)` | Hooks the library into nette-forms and attaches the listeners. It returns the API. |
| `validateControl(control)` | Validates one field and shows or removes its error. It returns `true` when the field is valid, has no rules or is ignored. |
| `handleChange(control)` | Validates a changed field and rechecks the dependent errors. Call it for widgets that do not fire a native `change` event, such as select2. |
| `clear(formOrControl)` | Removes the errors of a form or of one field. |
| `showErrors(form, errors)` | Shows the given errors as if the form was submitted, for example errors from an AJAX response. Each error is an object `{ element, message }`. |
| `focusFirstError(root?)` | Focuses the first visible invalid field in `root` (by default in the whole document) and scrolls to it. Use it after the server rendered errors. It returns whether a field got the focus. |
| `widgets` | An object with the built-in adapters `tomSelect`, `select2` and `flatpickr`. |
| `presets` | An object with the presets `bootstrap5`, `bootstrap4` and `plain`. |

The library also dispatches the event `nette-forms-live:errors`. It bubbles from the form after a submit and from
the field after a live validation. Its `detail` has three keys:

- `errors` is the list of errors, empty when everything is valid.
- `source` is `'form'` after a submit and `'control'` after a live validation.
- `hidden` lists the fields with an error that are not visible.

After a submit, the event comes before the focus, so a handler can first open the tab that contains a hidden field.

## Things to know

- The server still validates every submit. This library only shows what nette-forms finds in the browser.
- Calling `install()` again with options replaces all options. They are not merged with the previous ones.
- Do not write `novalidate` on a form by hand. nette-forms then does not validate the form on submit.
- With Naja, nette-forms and Naja both validate a valid AJAX form on submit, so the `nette-forms-live:errors` event
  fires twice with no errors.
- select2 does not fire a native `change` event, so it needs a
  [small bridge](https://github.com/neatous/nette-forms-live/blob/master/docs/usage.md#select2).

## Development

```sh
npm ci
npm run lint && npm run typecheck && npm test
npm run test:browser # Playwright: Chromium, Firefox, WebKit, mobile Safari
npm run build        # dist/ is committed; CI fails when it is out of date
```

CI tests against the lowest and the latest supported nette-forms.

## License

[MIT](LICENSE)
