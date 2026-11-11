# Changelog

All notable changes are documented here.

## Unreleased

The library is not released yet. Install it from the `master` branch on GitHub.

### Added

- The library shows the errors of nette-forms in the page markup. It has presets for Bootstrap 5, Bootstrap 4 and
  plain markup.
- A field is validated live: when it is changed, when it is left after editing, and while the user types if it shows
  an error.
- Errors that depend on a changed field are checked again.
- A field left by a click is validated after the click, so the clicked button does not move.
- After a submit, the first field with an error gets the focus and is scrolled into view. Widgets stay closed.
- Adapters support Tom Select, select2 and flatpickr. They can be switched off, and custom adapters can be added.
- Unparsable numbers and dates are reported in the form, with an optional custom message.
- A radio or checkbox list gets one message.
- Server-rendered errors stay until their field is edited or the form is submitted again.
- The library sets `aria-invalid` and `aria-describedby`. A screen reader announcement and an error summary are
  optional.
- The `nette-forms-live:errors` event reports every validation.
- The [usage guide](docs/usage.md) has examples and covers the migration from live-form-validation.
