# Changelog

All notable changes are documented here.

## [Unreleased]

### Fixed

- With `validateOn.blur: 'always'`, leaving the flatpickr altInput or mobileInput validated the field, for example when
  the arrow of the open calendar was clicked. These inputs (and the inputs of custom adapters whose typing edits the
  value) are now validated on leave only after an edit, as with `'dirty'`. flatpickr validates the field when its value
  changes, with `validateOn.change: true` (the default). Plain text fields and the search box of Tom Select keep
  `'always'`.

## [1.0.1] - 2026-11-16

The library is the same as in 1.0.0. Only the way it is released has changed.

### Changed

- Releases are built by GitHub Actions and published with npm trusted publishing (OIDC), so no npm token is stored
  anywhere. Each version comes with a provenance attestation that links it to the commit and the workflow run it was
  built from.
- A version built by CI is staged on npm first and becomes public only after a maintainer approves it with two-factor
  authentication.

## [1.0.0] - 2026-11-16

The first release, published on npm as `@neatous/nette-forms-live`.

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

[1.0.1]: https://github.com/neatous/nette-forms-live/releases/tag/v1.0.1
[1.0.0]: https://github.com/neatous/nette-forms-live/releases/tag/v1.0.0
