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
    // The element parameters are typed loosely, so the stricter types of nette-forms itself stay compatible.
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
    focus?(control: FormControl, options: { open: boolean }): boolean;
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

interface FlatpickrInstance {
    altInput?: HTMLInputElement;
    mobileInput?: HTMLInputElement;
    isOpen: boolean;
    close(): void;
}

interface TomSelectInstance {
    wrapper: HTMLElement;
    focus_node: HTMLElement;
    settings: { openOnFocus: boolean };
    focus(): void;
}

type WithFlatpickr = Element & { _flatpickr?: FlatpickrInstance };
type WithTomSelect = Element & { tomselect?: TomSelectInstance };

const FEEDBACK_ATTRIBUTE = 'data-nette-forms-live-feedback';
const SUMMARY_ATTRIBUTE = 'data-nette-forms-live-summary';
const ERRORS_EVENT = 'nette-forms-live:errors';

const TEXT_LIKE_TYPES = ['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'datetime-local',
    'month', 'week', 'time', 'color'];

const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock'];

const isFormControl = (element: unknown): element is FormControl & { form: HTMLFormElement } =>
    (element instanceof HTMLInputElement || element instanceof HTMLSelectElement
        || element instanceof HTMLTextAreaElement) && element.form !== null;

const isRadioOrCheckbox = (control: FormControl): boolean => control.type === 'radio' || control.type === 'checkbox';

const isTextLike = (element: EventTarget | null): boolean => element instanceof HTMLTextAreaElement
    || (element instanceof HTMLInputElement && TEXT_LIKE_TYPES.includes(element.type));

const isVisible = (element: Element): boolean => element.isConnected
    && !(element instanceof HTMLInputElement && element.type === 'hidden')
    && element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== 'hidden';

// The items of a radio list or a checkbox list share the name; the error belongs to the whole group.
const groupOf = (control: FormControl): FormControl[] => {
    if (!control.form || !control.name || !isRadioOrCheckbox(control)) {
        return [control];
    }

    const item = control.form.elements.namedItem(control.name);

    return item instanceof RadioNodeList ? Array.from(item).filter(isFormControl) : [control];
};

const outermost = (element: Element, selector: string): Element => {
    let result = element;

    while (result.parentElement && result.parentElement.matches(selector)) {
        result = result.parentElement;
    }

    return result;
};

const focusWithoutScroll = (element: Element): void => {
    if (element instanceof HTMLElement) {
        element.focus({ preventScroll: true });
    }
};

// ---------------------------------------------------------------------------------------------------------------------
// Widget adapters

const tomSelectOf = (control: Element): TomSelectInstance | undefined => (control as WithTomSelect).tomselect;

const flatpickrOf = (control: Element): FlatpickrInstance | undefined => (control as WithFlatpickr)._flatpickr;

const builtInWidgets: Record<WidgetName, WidgetAdapter> = {
    // Tom Select hides the select and shows its .ts-wrapper, which its Bootstrap 5 theme styles as invalid; the node
    // that takes the focus gets aria-invalid and aria-describedby too.
    tomSelect: {
        elements: (control) => {
            const tomSelect = tomSelectOf(control);

            return tomSelect ? [tomSelect.wrapper, tomSelect.focus_node] : [];
        },
        // Focusing runs Tom Select's onFocus, which opens the dropdown when openOnFocus is set; the setting is turned
        // off for this one synchronous focus.
        focus: (control, { open }) => {
            const tomSelect = tomSelectOf(control);

            if (!tomSelect || !isVisible(tomSelect.wrapper)) {
                return false;
            }

            const openOnFocus = tomSelect.settings.openOnFocus;

            if (!open) {
                tomSelect.settings.openOnFocus = false;
            }

            try {
                focusWithoutScroll(tomSelect.focus_node);
            } finally {
                tomSelect.settings.openOnFocus = openOnFocus;
            }

            return true;
        },
        originalOf: (element) => {
            const wrapper = element.closest('.ts-wrapper');
            const original = wrapper?.previousElementSibling;

            return original && tomSelectOf(original)?.wrapper === wrapper && isFormControl(original) ? original : null;
        },
        // Its input is a search box: typing there does not change the value of the select.
        inputEditsValue: false,
    },
    select2: {
        elements: (control) => {
            const next = control.nextElementSibling;

            if (!control.classList.contains('select2-hidden-accessible') || !next || !next.classList.contains('select2')) {
                return [];
            }

            const selection = next.querySelector('.select2-selection');

            return selection ? [selection] : [];
        },
    },
    // flatpickr shows altInput instead of the original, or mobileInput on touch devices, right after the original.
    flatpickr: {
        elements: (control) => {
            const picker = flatpickrOf(control);

            return [picker?.altInput, picker?.mobileInput].filter((input): input is HTMLInputElement => Boolean(input));
        },
        // flatpickr opens on focus; when it may not, the calendar is closed again in the same task, before any paint.
        // Without altInput the visible input is the control itself.
        focus: (control, { open }) => {
            const picker = flatpickrOf(control);
            const target = [picker?.mobileInput, picker?.altInput, control].find((input) => input && isVisible(input));

            if (!picker || !target) {
                return false;
            }

            const wasOpen = picker.isOpen;

            focusWithoutScroll(target);

            if (!open && !wasOpen && picker.isOpen) {
                picker.close();
            }

            return true;
        },
        originalOf: (element) => {
            const original = element.previousElementSibling;
            const picker = original ? flatpickrOf(original) : undefined;

            return picker && (picker.altInput === element || picker.mobileInput === element) && isFormControl(original)
                ? original
                : null;
        },
    },
};

// ---------------------------------------------------------------------------------------------------------------------
// Presets

const bootstrapFeedbackContainer = (checkSelector: string) => (control: FormControl): Element | null => {
    const group = groupOf(control);

    if (group.length > 1) {
        const check = group[0].closest(checkSelector);

        return (check || group[0]).parentElement;
    }

    if (isRadioOrCheckbox(control)) {
        return control.closest(checkSelector) || control.parentElement;
    }

    const inputGroup = control.closest('.input-group');

    if (inputGroup) {
        return outermost(inputGroup, '.input-group');
    }

    return control.parentElement;
};

export const presets: Record<PresetName, Preset> = {
    bootstrap5: {
        classes: { invalid: 'is-invalid', feedback: 'invalid-feedback', feedbackVisible: 'd-block' },
        feedbackContainer: bootstrapFeedbackContainer('.form-check'),
        markTargets: groupOf,
    },
    bootstrap4: {
        classes: { invalid: 'is-invalid', feedback: 'invalid-feedback', feedbackVisible: 'd-block' },
        feedbackContainer: bootstrapFeedbackContainer('.form-check, .custom-control'),
        markTargets: groupOf,
    },
    plain: {
        classes: { invalid: 'is-invalid', feedback: 'form-error', feedbackVisible: '' },
        feedbackContainer: (control) => {
            const group = groupOf(control);

            return group.length > 1 ? group[0].parentElement?.parentElement ?? null : control.parentElement;
        },
        markTargets: groupOf,
    },
};

const defaults: Options = {
    ...presets.bootstrap5,
    ignore: '[data-nette-forms-live="off"]',
    validateOn: { change: true, blur: 'dirty', input: 'recheck' },
    focusFirstError: true,
    focusOpensWidget: false,
    scrollToError: 'center',
    serverFeedback: 'remove',
    badInputMessage: null,
    widgets: { tomSelect: true, select2: true, flatpickr: true },
    summaryContainer: null,
    announce: null,
};

// ---------------------------------------------------------------------------------------------------------------------
// State

let nette: NetteForms | null = null;
let options: Options = defaults;
let adapters: WidgetAdapter[] = Object.values(builtInWidgets);
let feedbackCounter = 0;
let liveRegion: HTMLElement | null = null;
let announceTimer: ReturnType<typeof setTimeout> | undefined;

const dirty = new WeakSet<FormControl>();
const clientErrors = new WeakMap<HTMLFormElement, Set<FormControl>>(); // rule holders showing an error from the client
const formValidatedAt = new WeakMap<HTMLFormElement, number>(); // time of the last whole-form validation

let pointerPressed = false;
const pending = new Map<FormControl, { action: () => void; at: number }>(); // postponed until the pointer is released

const hasRules = (control: Element): boolean => control.hasAttribute('data-nette-rules');

// An element of a widget (its own input, its wrapper) stands for the original control.
const resolveControl = (element: EventTarget | null): EventTarget | null => {
    if (!(element instanceof Element)) {
        return element;
    }

    for (const adapter of adapters) {
        const original = adapter.originalOf?.(element);

        if (original) {
            return original;
        }
    }

    return element;
};

// The control that carries the rules. The items of a radio or checkbox list stand for the whole list: rendered item
// by item every item has the rules, rendered at once only the first one, so the first item with rules is used.
const ruleHolder = (control: unknown): FormControl | null => {
    if (!isFormControl(control)) {
        return null;
    }

    if (isRadioOrCheckbox(control)) {
        return groupOf(control).find(hasRules) || null;
    }

    return hasRules(control) ? control : null;
};

const isIgnored = (control: Element): boolean => Boolean(options.ignore) && control.closest(options.ignore) !== null;

const clientErrorsOf = (form: HTMLFormElement): Set<FormControl> => {
    let errors = clientErrors.get(form);

    if (!errors) {
        errors = new Set();
        clientErrors.set(form, errors);
    }

    return errors;
};

const classList = (classes: string): string[] => (classes || '').split(' ').filter(Boolean);

// An empty class option never matches, instead of matching everything.
const hasClasses = (element: Element, classes: string): boolean => {
    const list = classList(classes);

    return list.length > 0 && list.every((cls) => element.classList.contains(cls));
};

const widgetElements = (control: FormControl): Element[] => adapters.flatMap((adapter) => adapter.elements(control));

// The widget elements come first, so a visible widget is preferred to its hidden original.
const targetsOf = (control: FormControl): Element[] => [...widgetElements(control), ...options.markTargets(control)];

const hasInvalidClass = (control: FormControl): boolean => targetsOf(control)
    .some((element) => hasClasses(element, options.classes.invalid));

const setDescribedBy = (element: Element, id: string, add: boolean): void => {
    const ids = (element.getAttribute('aria-describedby') || '').split(' ').filter((value) => value && value !== id);

    if (add) {
        ids.push(id);
    }

    if (ids.length) {
        element.setAttribute('aria-describedby', ids.join(' '));
    } else {
        element.removeAttribute('aria-describedby');
    }
};

const feedbackElements = (container: Element): HTMLElement[] => Array.from(container.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement && hasClasses(child, options.classes.feedback));

const ownFeedback = (holder: FormControl, container: Element | null): HTMLElement | null => (container
    ? feedbackElements(container).find((feedback) => feedback.getAttribute(FEEDBACK_ATTRIBUTE) === holder.name)
    : undefined) || null;

// The container can be shared by several controls: the server-rendered messages cannot be told apart and go all.
const removeServerFeedback = (holder: FormControl, container: Element | null): void => {
    if (!container) {
        return;
    }

    feedbackElements(container)
        .filter((feedback) => !feedback.hasAttribute(FEEDBACK_ATTRIBUTE) && !feedback.hasAttribute(SUMMARY_ATTRIBUTE)
            && !feedback.hidden)
        .forEach((feedback) => {
            targetsOf(holder).forEach((element) => {
                setDescribedBy(element, feedback.id, false);
            });

            if (options.serverFeedback === 'empty') {
                feedback.textContent = '';
                feedback.classList.remove(...classList(options.classes.feedbackVisible));
                feedback.hidden = true;
            } else {
                feedback.remove();
            }
        });
};

const clearControl = (control: FormControl): void => {
    const holder = ruleHolder(control) || control;
    const container = options.feedbackContainer(holder);
    const own = ownFeedback(holder, container);

    targetsOf(holder).forEach((element) => {
        element.classList.remove(...classList(options.classes.invalid));
        element.removeAttribute('aria-invalid');

        if (own) {
            setDescribedBy(element, own.id, false);
        }
    });

    own?.remove();
    removeServerFeedback(holder, container);

    if (holder.form) {
        clientErrorsOf(holder.form).delete(holder);
    }
};

const clearSummary = (form: HTMLFormElement): void => {
    const container = options.summaryContainer?.(form);

    container?.querySelectorAll(`[${SUMMARY_ATTRIBUTE}]`).forEach((summary) => {
        summary.remove();
    });
};

// Also the controls without client rules, which can show an error rendered by the server.
const clearForm = (form: HTMLFormElement): void => {
    Array.from(form.elements)
        .filter(isFormControl)
        .filter((element) => hasRules(element) || hasInvalidClass(element))
        .forEach(clearControl);
    // Messages of controls that no longer exist or changed their name.
    form.querySelectorAll(`[${FEEDBACK_ATTRIBUTE}]`).forEach((feedback) => {
        feedback.remove();
    });
    clearSummary(form);
    clientErrors.delete(form);
};

/**
 * Marks a control and shows its message; an existing own message is updated in place. `client` errors come from the
 * client rules and are checked again live; the others (server-rendered, given to showErrors()) stay until edited.
 */
const showError = (control: FormControl, message: string, client: boolean): void => {
    const holder = ruleHolder(control) || control;
    const container = options.feedbackContainer(holder);
    const targets = targetsOf(holder);
    let feedback = ownFeedback(holder, container);

    targets.forEach((element) => {
        element.classList.add(...classList(options.classes.invalid));
        element.setAttribute('aria-invalid', 'true');
    });

    if (container && message !== '') {
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = `nette-forms-live-feedback-${String(++feedbackCounter)}`;
            feedback.setAttribute(FEEDBACK_ATTRIBUTE, holder.name);
            feedback.classList.add(...classList(options.classes.feedback), ...classList(options.classes.feedbackVisible));
            container.appendChild(feedback);
        }

        if (feedback.textContent !== message) {
            feedback.textContent = message;
        }

        targets.forEach((element) => {
            setDescribedBy(element, feedback?.id ?? '', true);
        });
    } else if (feedback) {
        feedback.remove();
    }

    if (holder.form) {
        const errors = clientErrorsOf(holder.form);

        if (client) {
            errors.add(holder);
        } else {
            errors.delete(holder);
        }
    }
};

// One error per control; nette-forms reports every item of a radio list rendered item by item. Returns the shown
// controls and the errors that have no control to be shown at.
const renderErrors = (errors: FormError[], client: boolean): { holders: FormControl[]; unplaced: FormError[] } => {
    const shown = new Set<FormControl>();
    const unplaced: FormError[] = [];

    errors.forEach((error) => {
        if (!isFormControl(error.element)) {
            unplaced.push(error);

            return;
        }

        const holder = ruleHolder(error.element) || error.element;

        if (!shown.has(holder)) {
            shown.add(holder);
            showError(holder, error.message, client);
        }
    });

    return { holders: Array.from(shown), unplaced };
};

const isControlVisible = (control: FormControl): boolean => targetsOf(control).some(isVisible);

// The focused element is scrolled into view, then its message if it is not visible yet (the feedback container can be
// a large box, so it is not scrolled as a whole).
const scrollIntoView = (control: FormControl, focused: Element): void => {
    if (options.scrollToError) {
        const container = options.feedbackContainer(control);
        const message = ownFeedback(control, container)
            ?? (container ? feedbackElements(container).find((feedback) => !feedback.hidden) : undefined);

        focused.scrollIntoView({ block: options.scrollToError });
        message?.scrollIntoView({ block: 'nearest' });
    }
};

// Focuses a control through its widget adapter, or the first visible marked element; scrolls it (with its message)
// into view. Returns whether something got the focus.
const focusControl = (control: FormControl): boolean => {
    for (const adapter of adapters) {
        if (adapter.focus?.(control, { open: options.focusOpensWidget })) {
            scrollIntoView(control, document.activeElement ?? control);

            return true;
        }
    }

    // The first visible marked element that really takes the focus.
    for (const target of targetsOf(control)) {
        if (target instanceof HTMLElement && isVisible(target)) {
            focusWithoutScroll(target);

            if (document.activeElement === target) {
                scrollIntoView(control, target);

                return true;
            }
        }
    }

    return false;
};

const announce = (info: AnnounceInfo): void => {
    const text = options.announce?.(info);

    if (!text) {
        return;
    }

    if (!liveRegion || !liveRegion.isConnected) {
        liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;'
            + 'clip:rect(0,0,0,0);white-space:nowrap;border:0';
        document.body.appendChild(liveRegion);
    }

    // Emptied first and filled a moment later, so the same text is announced again; one validation that also rechecks
    // dependent controls announces only its last text.
    const region = liveRegion;
    region.textContent = '';
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
        region.textContent = text;
    }, 50);
};

const showSummary = (form: HTMLFormElement, errors: FormError[]): void => {
    const container = options.summaryContainer?.(form);

    if (!container || errors.length === 0) {
        return;
    }

    const summary = document.createElement('div');
    const list = document.createElement('ul');

    summary.setAttribute(SUMMARY_ATTRIBUTE, '');
    summary.setAttribute('role', 'alert');
    summary.classList.add(...classList(options.classes.feedback), ...classList(options.classes.feedbackVisible));
    errors.forEach(({ message }) => {
        const item = document.createElement('li');

        item.textContent = message;
        list.appendChild(item);
    });
    summary.appendChild(list);
    container.appendChild(summary);
};

const dispatchErrors = (target: Element, errors: FormError[], source: ErrorsEventDetail['source'],
    hidden: FormControl[]): void => {
    target.dispatchEvent(new CustomEvent<ErrorsEventDetail>(ERRORS_EVENT, {
        bubbles: true,
        detail: { errors, source, hidden },
    }));
};

const warnHidden = (controls: FormControl[]): void => {
    if (controls.length && typeof console !== 'undefined') {
        console.warn('NetteFormsLive: errors of controls that are not visible', controls.map((control) => control.name));
    }
};

/**
 * Shows the errors of a form: the replacement of nette-forms' showFormErrors() (`client` errors) and showErrors().
 * The event goes out before the focus, so a handler can reveal a hidden control (open a tab) first.
 */
const showFormErrors = (form: HTMLFormElement, errors: FormError[], client = true): void => {
    formValidatedAt.set(form, performance.now());
    Array.from(form.elements).filter(isFormControl).forEach((element) => dirty.delete(element));
    clearForm(form);

    const { holders, unplaced } = renderErrors(errors, client);

    dispatchErrors(form, errors, 'form', holders.filter((holder) => !isControlVisible(holder)));

    // Computed again on purpose: a handler of the event may have revealed some controls.
    const hidden = holders.filter((holder) => !isControlVisible(holder));

    warnHidden(hidden);
    showSummary(form, [...unplaced, ...errors.filter((error) => isFormControl(error.element)
        && hidden.includes(ruleHolder(error.element) || error.element))]);

    if (options.focusFirstError) {
        holders.some(focusControl);
    }

    announce({ errors, source: 'form', form });
};

const requireNette = (): NetteForms => {
    if (!nette) {
        throw new Error('NetteFormsLive: call install() first.');
    }

    return nette;
};

const badInputText = (control: FormControl): string => {
    const message = options.badInputMessage;

    if (typeof message === 'function') {
        return message(control);
    }

    return message ?? control.validationMessage;
};

// Runs the client rules of a control without rendering anything.
const checkControl = (holder: FormControl): { valid: boolean; errors: FormError[] } => {
    const netteForms = requireNette();
    const saved = netteForms.formErrors;

    netteForms.formErrors = [];

    const disabled = netteForms.isDisabled(holder);
    let valid = disabled || netteForms.validateControl(holder, undefined, false);
    let errors: FormError[] = netteForms.formErrors;

    netteForms.formErrors = saved;

    // An unparsable value (a number or a date the browser cannot read) passes a rule like "filled" in nette-forms,
    // which then reports it only through the browser bubble on submit.
    if (holder.validity.badInput && !disabled) {
        valid = false;
        errors = errors.length ? errors : [{ element: holder, message: badInputText(holder) }];
    }

    return { valid, errors: valid ? [] : errors };
};

const renderControlValidation = (holder: FormControl): boolean => {
    dirty.delete(holder);

    const { valid, errors } = checkControl(holder);

    if (valid) {
        clearControl(holder);
    } else {
        removeServerFeedback(holder, options.feedbackContainer(holder));
        renderErrors(errors.length ? errors : [{ element: holder, message: '' }], true);
    }

    dispatchErrors(holder, errors, 'control', valid || isControlVisible(holder) ? [] : [holder]);

    if (holder.form) {
        announce({ errors, source: 'control', form: holder.form });
    }

    return valid;
};

/**
 * Validates one control (with its list) and shows or clears its error. Returns whether it is valid.
 */
const validateControl = (control: Element): boolean => {
    const holder = ruleHolder(resolveControl(control));

    return !holder || isIgnored(holder) || renderControlValidation(holder);
};

// The controls of the form showing an error from the client may depend on the changed one (an equal password,
// a field required only when a checkbox is checked), so their errors are checked again. `clearOnly` removes the errors
// that became valid and leaves the others as they are (used while typing).
const revalidateClientErrors = (form: HTMLFormElement, except: FormControl | null, clearOnly = false): void => {
    Array.from(clientErrorsOf(form))
        .filter((holder) => holder !== except && holder.isConnected && holder.form === form)
        .forEach((holder) => {
            if (!clearOnly) {
                validateControl(holder);
            } else if (checkControl(holder).valid) {
                clearControl(holder);
                dispatchErrors(holder, [], 'control', []);
            }
        });
};

/**
 * Reacts to a changed control: validates it, removes a server error of a control without client rules and checks
 * again the errors that may depend on it. For widgets that announce their changes in another way (select2 only
 * triggers a jQuery event), the project calls it from its own handler.
 */
const handleChange = (element: Element): void => {
    const control = resolveControl(element);

    if (!isFormControl(control) || isIgnored(control)) {
        return;
    }

    const holder = ruleHolder(control);

    if (holder && options.validateOn.change) {
        validateControl(holder);
    } else if (hasInvalidClass(control) && !(holder && clientErrorsOf(control.form).has(holder))) {
        // A server error goes when its field changes, also when live validation of changes is off.
        clearControl(control);
    }

    revalidateClientErrors(control.form, holder);
};

// Work that would change the layout while the pointer is pressed (on a submit button, for example) is postponed
// until the click has been dispatched; a submit started by that click validates the whole form anyway.
const runLater = (control: FormControl, action: () => void): void => {
    if (!pointerPressed) {
        action();

        return;
    }

    // The first postponed work of a control wins: a change (which also checks the dependent errors) comes before
    // the focusout of the same control.
    if (!pending.has(control)) {
        pending.set(control, { action, at: performance.now() });
    }
};

const flushPending = (deferred: boolean): void => {
    const entries = Array.from(pending.entries());

    pending.clear();

    const run = (): void => {
        entries.forEach(([control, { action, at }]) => {
            if (control.isConnected && control.form && (formValidatedAt.get(control.form) || 0) < at) {
                action();
            }
        });
    };

    if (deferred) {
        setTimeout(run, 0);
    } else {
        run();
    }
};

// While typing, a control showing an error from the client is rechecked: the error goes once the value is valid, an
// invalid value keeps it (with the current message); a control without an error never gets one while typing.
const recheckWhileTyping = (holder: FormControl): void => {
    const form = holder.form;

    if (!form) {
        return;
    }

    if (clientErrorsOf(form).has(holder)) {
        const { valid, errors } = checkControl(holder);

        if (valid) {
            clearControl(holder);
        } else {
            renderErrors(errors, true);
        }

        dispatchErrors(holder, errors, 'control', valid || isControlVisible(holder) ? [] : [holder]);
    } else if (hasInvalidClass(holder)) {
        // A server error cannot be checked in the browser, and the value it referred to has changed.
        clearControl(holder);
    }

    revalidateClientErrors(form, holder, true);
};

// Typing into a widget's search box (Tom Select) does not change the value of the control; the real change arrives on
// the control itself.
const isSearchInput = (target: EventTarget | null, control: FormControl): boolean => target !== control
    && target instanceof Element
    && adapters.some((adapter) => adapter.inputEditsValue === false && adapter.originalOf?.(target) === control);

const onInput = (event: Event): void => {
    if (!event.isTrusted || (event as InputEvent).isComposing) {
        return;
    }

    const control = resolveControl(event.target);

    if (!isFormControl(control) || isIgnored(control)) {
        return;
    }

    if (isSearchInput(event.target, control)) {
        return;
    }

    const holder = ruleHolder(control);

    if (!holder) {
        if (hasInvalidClass(control)) {
            clearControl(control);
        }

        return;
    }

    if (!isTextLike(event.target)) {
        return;
    }

    dirty.add(holder);

    if (options.validateOn.input === 'recheck') {
        recheckWhileTyping(holder);
    } else if (options.validateOn.input === 'clear') {
        clearControl(holder);
    }
};

const onChange = (event: Event): void => {
    const control = resolveControl(event.target);

    if (isFormControl(control) && !isSearchInput(event.target, control)) {
        runLater(control, () => {
            handleChange(control);
        });
    }
};

const onFocusOut = (event: FocusEvent): void => {
    const holder = ruleHolder(resolveControl(event.target));
    const mode = options.validateOn.blur;

    if (!mode || !holder || !isTextLike(event.target) || isIgnored(holder)) {
        return;
    }

    if (mode === 'dirty' && !dirty.has(holder)) {
        return;
    }

    runLater(holder, () => {
        if (mode !== 'dirty' || dirty.has(holder)) {
            validateControl(holder);
        }
    });
};

const onPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) {
        pointerPressed = true;
    }
};

// The click (and a submit it starts) is dispatched right after pointerup, so the postponed work runs in a later
// task.
const onPointerUp = (): void => {
    if (pointerPressed) {
        pointerPressed = false;
        flushPending(true);
    }
};

// A press can end without pointerup (a context menu, a release outside the window); the postponed work then runs
// at once. A modifier key held during a click does not end it.
const onPressInterrupted = (event?: Event): void => {
    if (event instanceof KeyboardEvent && MODIFIER_KEYS.includes(event.key)) {
        return;
    }

    if (pointerPressed) {
        pointerPressed = false;
        flushPending(false);
    }
};

// nette-forms reports an unparsable value (validity.badInput) through reportValidity(), which fires "invalid" and
// shows the browser bubble; the message is rendered like the other errors instead, also for an ignored control.
const onInvalid = (event: Event): void => {
    const holder = ruleHolder(event.target);

    if (!holder || !holder.validity.badInput || !holder.form) {
        return;
    }

    // nette-forms stops the validation of the form at this control, so the other errors may be stale; the result is
    // shown like a submit with this one error.
    event.preventDefault();
    showFormErrors(holder.form, checkControl(holder).errors, true);
};

// Listens in the bubbling phase, so a reset cancelled by the page keeps the errors.
const onReset = (event: Event): void => {
    if (event.target instanceof HTMLFormElement && !event.defaultPrevented) {
        Array.from(event.target.elements).filter(isFormControl).forEach((element) => dirty.delete(element));
        clearForm(event.target);
    }
};

const mergeOptions = (userOptions: UserOptions): Options => {
    const { preset: presetOption, ...rest } = userOptions;
    let preset: Preset | undefined;

    if (typeof presetOption === 'string') {
        // A plain JavaScript caller can pass any string.
        preset = (presets as Partial<Record<string, Preset>>)[presetOption];

        if (!preset) {
            throw new Error(`NetteFormsLive: unknown preset "${presetOption}".`);
        }
    } else {
        preset = presetOption;
    }

    const base: Options = { ...defaults, ...(preset || {}) };

    return {
        ...base,
        ...rest,
        classes: { ...base.classes, ...(rest.classes || {}) },
        validateOn: { ...base.validateOn, ...(rest.validateOn || {}) },
        widgets: { ...base.widgets, ...(rest.widgets || {}) },
    };
};

const resolveAdapters = (widgets: Options['widgets']): WidgetAdapter[] => Object.entries(widgets)
    .map(([name, value]) => {
        if (value === true) {
            const builtIn = (builtInWidgets as Partial<Record<string, WidgetAdapter>>)[name];

            if (!builtIn) {
                throw new Error(`NetteFormsLive: unknown widget "${name}".`);
            }

            return builtIn;
        }

        return value === false ? null : value;
    })
    .filter((adapter): adapter is WidgetAdapter => adapter !== null);

/**
 * Hooks into the nette-forms instance. Calling it again with options replaces all options (merged over the defaults,
 * not over the previous ones); without options it keeps them. The listeners are attached once.
 */
const install = (netteForms: NetteForms, userOptions?: UserOptions): NetteFormsLiveApi => {
    const firstInstall = nette === null;

    nette = netteForms;

    if (firstInstall || userOptions) {
        options = mergeOptions(userOptions || {});
        adapters = resolveAdapters(options.widgets);
    }

    nette.showFormErrors = (form, errors) => {
        showFormErrors(form, errors, true);
    };

    if (firstInstall) {
        document.addEventListener('input', onInput, true);
        document.addEventListener('change', onChange, true);
        document.addEventListener('focusout', onFocusOut, true);
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('pointerup', onPointerUp, true);
        document.addEventListener('pointercancel', onPressInterrupted, true);
        document.addEventListener('contextmenu', onPressInterrupted, true);
        document.addEventListener('dragstart', onPressInterrupted, true);
        document.addEventListener('keydown', onPressInterrupted, true);
        window.addEventListener('blur', onPressInterrupted);
        document.addEventListener('invalid', onInvalid, true);
        document.addEventListener('reset', onReset);
    }

    return NetteFormsLive;
};

/**
 * Removes the errors of a form or of a single control.
 */
const clear = (formOrControl: HTMLFormElement | Element): void => {
    if (formOrControl instanceof HTMLFormElement) {
        clearForm(formOrControl);
    } else if (isFormControl(formOrControl)) {
        clearControl(formOrControl);
    }
};

/**
 * Shows errors in a form as if it was submitted. They are treated like server errors: they stay until their control
 * is edited or the form is validated again.
 */
const showErrors = (form: HTMLFormElement, errors: FormError[]): void => {
    showFormErrors(form, errors, false);
};

/**
 * Focuses (and scrolls to) the first visible control marked as invalid in the given root, for example the errors the
 * server rendered after a page load or a snippet redraw. Returns whether a control got the focus.
 */
const focusFirstError = (root: ParentNode = document): boolean => {
    const controls = Array.from(root.querySelectorAll('input, select, textarea'))
        .filter(isFormControl)
        .filter((control) => hasInvalidClass(control));

    return controls.some((control) => isControlVisible(control) && focusControl(ruleHolder(control) || control));
};

const NetteFormsLive: NetteFormsLiveApi = {
    presets,
    widgets: builtInWidgets,
    install,
    validateControl,
    handleChange,
    clear,
    showErrors,
    focusFirstError,
};

export { install, validateControl, handleChange, clear, showErrors, focusFirstError, builtInWidgets as widgets };
export default NetteFormsLive;
