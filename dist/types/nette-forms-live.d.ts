/**
 * NetteFormsLive: renders the validation errors of nette-forms in the markup of the page (Bootstrap 5 by default) and
 * validates the controls while the user fills the form in.
 *
 * nette-forms itself is not part of this library: the page loads it (the netteForms.js shipped with the installed
 * nette/forms, so the client rules always match the server ones) and passes its instance to install().
 *
 *   NetteFormsLive.install(window.Nette, { ...options });
 *
 * - Errors of a submitted form: nette-forms validates the form and calls showFormErrors(), which this library replaces;
 *   all errors are shown, the first visible erroneous control gets the focus (a widget is not opened) and is scrolled
 *   into view. Native "bad input" (an unparsable number or date) is rendered the same way instead of the browser bubble.
 * - Live validation: a changed control is validated; a control is validated when left after the user edited it, never
 *   when merely tabbed through; while a control shows an error, typing rechecks it, so the error disappears as soon as
 *   the value is valid. A control left by a click, for example on the submit button, is validated after the click, so
 *   a message appearing above the button does not move it away from under the pointer.
 * - Errors rendered by the server stay until their control is edited or the form is submitted again.
 * - Widgets (Tom Select, select2, flatpickr) are supported by switchable adapters; projects can add their own.
 *
 * The listeners are delegated to the document, so forms added later by a snippet need no initialisation.
 */
/** A form control nette-forms can validate. */
export type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
/** An error as nette-forms reports it. Errors of elements other than form controls go to the summary only. */
export interface FormError {
    element: Element;
    message: string;
}
/**
 * The part of the nette-forms instance (window.Nette, or the default export of the nette-forms package) the library
 * uses. Declared here, so the types of this library do not require the nette-forms package to be installed.
 */
export interface NetteForms {
    formErrors: FormError[];
    validateControl(elem: Element, rules?: unknown, onlyCheck?: boolean): boolean;
    isDisabled(elem: Element): boolean;
    showFormErrors(form: HTMLFormElement, errors: FormError[]): void;
}
export interface Classes {
    /** Class(es) of an invalid control, separated by spaces. */
    invalid: string;
    /** Class(es) of an error message. */
    feedback: string;
    /** Class(es) that make a message visible wherever it is placed (it is not always a sibling of the control). */
    feedbackVisible: string;
}
export interface Preset {
    classes: Classes;
    /** The element the message of a control is appended to; null for no message. */
    feedbackContainer: (control: FormControl) => Element | null;
    /** The elements of the control itself that get the invalid class (the widget elements are added by the adapters). */
    markTargets: (control: FormControl) => Element[];
}
/**
 * A widget that hides a form control and shows its own elements instead (Tom Select, select2, flatpickr, ...).
 */
export interface WidgetAdapter {
    /** The visible elements of the widget standing for the control; empty when the control is not this widget. */
    elements(control: FormControl): Element[];
    /** Focuses the widget; `open` tells whether it may open (a dropdown, a calendar). Returns whether it handled it. */
    focus?(control: FormControl, options: {
        open: boolean;
    }): boolean;
    /** The original control an element of the widget belongs to (events come from the widget's own inputs). */
    originalOf?(element: Element): FormControl | null;
    /** Whether typing into the widget's own input edits the value (false for a search box); true by default. */
    inputEditsValue?: boolean;
}
export type WidgetName = 'tomSelect' | 'select2' | 'flatpickr';
export interface ValidateOn {
    /** Validate a changed control. */
    change: boolean;
    /** 'dirty': validate a left text field edited since its last validation; 'always': every left text field; false: never. */
    blur: 'dirty' | 'always' | false;
    /**
     * 'recheck': while a control shows an error, typing rechecks it and removes the error once valid (new errors are
     * never shown while typing); 'clear': typing hides the error until the control is validated again; false: nothing.
     */
    input: 'recheck' | 'clear' | false;
}
/** Passed to the `announce` option. */
export interface AnnounceInfo {
    errors: FormError[];
    source: 'form' | 'control';
    form: HTMLFormElement;
}
export interface Options extends Preset {
    /** Controls (or forms, through an ancestor) not validated live; their submit errors are still shown. */
    ignore: string;
    validateOn: ValidateOn;
    /** Focus the first visible erroneous control after a submit. */
    focusFirstError: boolean;
    /** Whether focusing an erroneous widget may open it (Tom Select dropdown, flatpickr calendar). */
    focusOpensWidget: boolean;
    /** How the focused error is scrolled into view (with its message); false: no scrolling at all. */
    scrollToError: 'center' | 'nearest' | false;
    /** What happens to an error rendered by the server when its control gets validated. */
    serverFeedback: 'remove' | 'empty';
    /** The message of an unparsable number or date when no rule message applies; null keeps the browser's text. */
    badInputMessage: string | ((control: FormControl) => string) | null;
    /** Built-in widget adapters (true/false) and custom ones. */
    widgets: Partial<Record<WidgetName, boolean | WidgetAdapter>> & Record<string, boolean | WidgetAdapter>;
    /** Where the messages of errors that cannot be shown at a visible control are listed; null for nowhere. */
    summaryContainer: ((form: HTMLFormElement) => Element | null) | null;
    /** A text announced to screen readers after a validation; null for no announcement. */
    announce: ((info: AnnounceInfo) => string | null) | null;
}
export type PresetName = 'bootstrap5' | 'bootstrap4' | 'plain';
export interface UserOptions extends Partial<Omit<Options, 'classes' | 'validateOn' | 'widgets'>> {
    preset?: PresetName | Preset;
    classes?: Partial<Classes>;
    validateOn?: Partial<ValidateOn>;
    widgets?: Partial<Record<WidgetName, boolean | WidgetAdapter>> & Record<string, boolean | WidgetAdapter>;
}
/** Detail of the `nette-forms-live:errors` event, dispatched after a form or a single control was validated. */
export interface ErrorsEventDetail {
    errors: FormError[];
    source: 'form' | 'control';
    /** Controls with an error that were not visible when the event was dispatched (a handler can reveal them). */
    hidden: FormControl[];
}
/** The public API, available as the default export and as window.NetteFormsLive in the IIFE build. */
export interface NetteFormsLiveApi {
    presets: Record<PresetName, Preset>;
    widgets: Record<WidgetName, WidgetAdapter>;
    install(netteForms: NetteForms, userOptions?: UserOptions): NetteFormsLiveApi;
    validateControl(control: Element): boolean;
    handleChange(control: Element): void;
    clear(formOrControl: HTMLFormElement | Element): void;
    showErrors(form: HTMLFormElement, errors: FormError[]): void;
    focusFirstError(root?: ParentNode): boolean;
}
declare const builtInWidgets: Record<WidgetName, WidgetAdapter>;
export declare const presets: Record<PresetName, Preset>;
/**
 * Validates one control (with its list) and shows or clears its error. Returns whether it is valid.
 */
declare const validateControl: (control: Element) => boolean;
/**
 * Reacts to a changed control: validates it, removes a server error of a control without client rules and checks
 * again the errors that may depend on it. For widgets that announce their changes in another way (select2 only
 * triggers a jQuery event), the project calls it from its own handler.
 */
declare const handleChange: (element: Element) => void;
/**
 * Hooks into the nette-forms instance. Calling it again with options replaces all options (merged over the defaults,
 * not over the previous ones); without options it keeps them. The listeners are attached once.
 */
declare const install: (netteForms: NetteForms, userOptions?: UserOptions) => NetteFormsLiveApi;
/**
 * Removes the errors of a form or of a single control.
 */
declare const clear: (formOrControl: HTMLFormElement | Element) => void;
/**
 * Shows errors in a form as if it was submitted. They are treated like server errors: they stay until their control
 * is edited or the form is validated again.
 */
declare const showErrors: (form: HTMLFormElement, errors: FormError[]) => void;
/**
 * Focuses (and scrolls to) the first visible control marked as invalid in the given root, for example the errors the
 * server rendered after a page load or a snippet redraw. Returns whether a control got the focus.
 */
declare const focusFirstError: (root?: ParentNode) => boolean;
declare const NetteFormsLive: NetteFormsLiveApi;
export { install, validateControl, handleChange, clear, showErrors, focusFirstError, builtInWidgets as widgets };
export default NetteFormsLive;
