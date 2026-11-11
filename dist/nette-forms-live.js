(function () {
"use strict";
(() => {
  // src/nette-forms-live.ts
  var FEEDBACK_ATTRIBUTE = "data-nette-forms-live-feedback";
  var SUMMARY_ATTRIBUTE = "data-nette-forms-live-summary";
  var ERRORS_EVENT = "nette-forms-live:errors";
  var TEXT_LIKE_TYPES = [
    "text",
    "search",
    "email",
    "url",
    "tel",
    "password",
    "number",
    "date",
    "datetime-local",
    "month",
    "week",
    "time",
    "color"
  ];
  var MODIFIER_KEYS = ["Shift", "Control", "Alt", "Meta", "AltGraph", "CapsLock"];
  var isFormControl = (element) => (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) && element.form !== null;
  var isRadioOrCheckbox = (control) => control.type === "radio" || control.type === "checkbox";
  var isTextLike = (element) => element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement && TEXT_LIKE_TYPES.includes(element.type);
  var isVisible = (element) => element.isConnected && !(element instanceof HTMLInputElement && element.type === "hidden") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  var groupOf = (control) => {
    if (!control.form || !control.name || !isRadioOrCheckbox(control)) {
      return [control];
    }
    const item = control.form.elements.namedItem(control.name);
    return item instanceof RadioNodeList ? Array.from(item).filter(isFormControl) : [control];
  };
  var outermost = (element, selector) => {
    let result = element;
    while (result.parentElement && result.parentElement.matches(selector)) {
      result = result.parentElement;
    }
    return result;
  };
  var focusWithoutScroll = (element) => {
    if (element instanceof HTMLElement) {
      element.focus({ preventScroll: true });
    }
  };
  var tomSelectOf = (control) => control.tomselect;
  var flatpickrOf = (control) => control._flatpickr;
  var builtInWidgets = {
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
        const wrapper = element.closest(".ts-wrapper");
        const original = wrapper?.previousElementSibling;
        return original && tomSelectOf(original)?.wrapper === wrapper && isFormControl(original) ? original : null;
      },
      // Its input is a search box: typing there does not change the value of the select.
      inputEditsValue: false
    },
    select2: {
      elements: (control) => {
        const next = control.nextElementSibling;
        if (!control.classList.contains("select2-hidden-accessible") || !next || !next.classList.contains("select2")) {
          return [];
        }
        const selection = next.querySelector(".select2-selection");
        return selection ? [selection] : [];
      }
    },
    // flatpickr shows altInput instead of the original, or mobileInput on touch devices, right after the original.
    flatpickr: {
      elements: (control) => {
        const picker = flatpickrOf(control);
        return [picker?.altInput, picker?.mobileInput].filter((input) => Boolean(input));
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
        const picker = original ? flatpickrOf(original) : void 0;
        return picker && (picker.altInput === element || picker.mobileInput === element) && isFormControl(original) ? original : null;
      }
    }
  };
  var bootstrapFeedbackContainer = (checkSelector) => (control) => {
    const group = groupOf(control);
    if (group.length > 1) {
      const check = group[0].closest(checkSelector);
      return (check || group[0]).parentElement;
    }
    if (isRadioOrCheckbox(control)) {
      return control.closest(checkSelector) || control.parentElement;
    }
    const inputGroup = control.closest(".input-group");
    if (inputGroup) {
      return outermost(inputGroup, ".input-group");
    }
    return control.parentElement;
  };
  var presets = {
    bootstrap5: {
      classes: { invalid: "is-invalid", feedback: "invalid-feedback", feedbackVisible: "d-block" },
      feedbackContainer: bootstrapFeedbackContainer(".form-check"),
      markTargets: groupOf
    },
    bootstrap4: {
      classes: { invalid: "is-invalid", feedback: "invalid-feedback", feedbackVisible: "d-block" },
      feedbackContainer: bootstrapFeedbackContainer(".form-check, .custom-control"),
      markTargets: groupOf
    },
    plain: {
      classes: { invalid: "is-invalid", feedback: "form-error", feedbackVisible: "" },
      feedbackContainer: (control) => {
        const group = groupOf(control);
        return group.length > 1 ? group[0].parentElement?.parentElement ?? null : control.parentElement;
      },
      markTargets: groupOf
    }
  };
  var defaults = {
    ...presets.bootstrap5,
    ignore: '[data-nette-forms-live="off"]',
    validateOn: { change: true, blur: "dirty", input: "recheck" },
    focusFirstError: true,
    focusOpensWidget: false,
    scrollToError: "center",
    serverFeedback: "remove",
    badInputMessage: null,
    widgets: { tomSelect: true, select2: true, flatpickr: true },
    summaryContainer: null,
    announce: null
  };
  var nette = null;
  var options = defaults;
  var adapters = Object.values(builtInWidgets);
  var feedbackCounter = 0;
  var liveRegion = null;
  var announceTimer;
  var dirty = /* @__PURE__ */ new WeakSet();
  var clientErrors = /* @__PURE__ */ new WeakMap();
  var formValidatedAt = /* @__PURE__ */ new WeakMap();
  var pointerPressed = false;
  var pending = /* @__PURE__ */ new Map();
  var hasRules = (control) => control.hasAttribute("data-nette-rules");
  var resolveControl = (element) => {
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
  var ruleHolder = (control) => {
    if (!isFormControl(control)) {
      return null;
    }
    if (isRadioOrCheckbox(control)) {
      return groupOf(control).find(hasRules) || null;
    }
    return hasRules(control) ? control : null;
  };
  var isIgnored = (control) => Boolean(options.ignore) && control.closest(options.ignore) !== null;
  var clientErrorsOf = (form) => {
    let errors = clientErrors.get(form);
    if (!errors) {
      errors = /* @__PURE__ */ new Set();
      clientErrors.set(form, errors);
    }
    return errors;
  };
  var classList = (classes) => (classes || "").split(" ").filter(Boolean);
  var hasClasses = (element, classes) => {
    const list = classList(classes);
    return list.length > 0 && list.every((cls) => element.classList.contains(cls));
  };
  var widgetElements = (control) => adapters.flatMap((adapter) => adapter.elements(control));
  var targetsOf = (control) => [...widgetElements(control), ...options.markTargets(control)];
  var hasInvalidClass = (control) => targetsOf(control).some((element) => hasClasses(element, options.classes.invalid));
  var setDescribedBy = (element, id, add) => {
    const ids = (element.getAttribute("aria-describedby") || "").split(" ").filter((value) => value && value !== id);
    if (add) {
      ids.push(id);
    }
    if (ids.length) {
      element.setAttribute("aria-describedby", ids.join(" "));
    } else {
      element.removeAttribute("aria-describedby");
    }
  };
  var feedbackElements = (container) => Array.from(container.children).filter((child) => child instanceof HTMLElement && hasClasses(child, options.classes.feedback));
  var ownFeedback = (holder, container) => (container ? feedbackElements(container).find((feedback) => feedback.getAttribute(FEEDBACK_ATTRIBUTE) === holder.name) : void 0) || null;
  var removeServerFeedback = (holder, container) => {
    if (!container) {
      return;
    }
    feedbackElements(container).filter((feedback) => !feedback.hasAttribute(FEEDBACK_ATTRIBUTE) && !feedback.hasAttribute(SUMMARY_ATTRIBUTE) && !feedback.hidden).forEach((feedback) => {
      targetsOf(holder).forEach((element) => {
        setDescribedBy(element, feedback.id, false);
      });
      if (options.serverFeedback === "empty") {
        feedback.textContent = "";
        feedback.classList.remove(...classList(options.classes.feedbackVisible));
        feedback.hidden = true;
      } else {
        feedback.remove();
      }
    });
  };
  var clearControl = (control) => {
    const holder = ruleHolder(control) || control;
    const container = options.feedbackContainer(holder);
    const own = ownFeedback(holder, container);
    targetsOf(holder).forEach((element) => {
      element.classList.remove(...classList(options.classes.invalid));
      element.removeAttribute("aria-invalid");
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
  var clearSummary = (form) => {
    const container = options.summaryContainer?.(form);
    container?.querySelectorAll(`[${SUMMARY_ATTRIBUTE}]`).forEach((summary) => {
      summary.remove();
    });
  };
  var clearForm = (form) => {
    Array.from(form.elements).filter(isFormControl).filter((element) => hasRules(element) || hasInvalidClass(element)).forEach(clearControl);
    form.querySelectorAll(`[${FEEDBACK_ATTRIBUTE}]`).forEach((feedback) => {
      feedback.remove();
    });
    clearSummary(form);
    clientErrors.delete(form);
  };
  var showError = (control, message, client) => {
    const holder = ruleHolder(control) || control;
    const container = options.feedbackContainer(holder);
    const targets = targetsOf(holder);
    let feedback = ownFeedback(holder, container);
    targets.forEach((element) => {
      element.classList.add(...classList(options.classes.invalid));
      element.setAttribute("aria-invalid", "true");
    });
    if (container && message !== "") {
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.id = `nette-forms-live-feedback-${String(++feedbackCounter)}`;
        feedback.setAttribute(FEEDBACK_ATTRIBUTE, holder.name);
        feedback.classList.add(...classList(options.classes.feedback), ...classList(options.classes.feedbackVisible));
        container.appendChild(feedback);
      }
      if (feedback.textContent !== message) {
        feedback.textContent = message;
      }
      targets.forEach((element) => {
        setDescribedBy(element, feedback?.id ?? "", true);
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
  var renderErrors = (errors, client) => {
    const shown = /* @__PURE__ */ new Set();
    const unplaced = [];
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
  var isControlVisible = (control) => targetsOf(control).some(isVisible);
  var scrollIntoView = (control, focused) => {
    if (options.scrollToError) {
      const container = options.feedbackContainer(control);
      const message = ownFeedback(control, container) ?? (container ? feedbackElements(container).find((feedback) => !feedback.hidden) : void 0);
      focused.scrollIntoView({ block: options.scrollToError });
      message?.scrollIntoView({ block: "nearest" });
    }
  };
  var focusControl = (control) => {
    for (const adapter of adapters) {
      if (adapter.focus?.(control, { open: options.focusOpensWidget })) {
        scrollIntoView(control, document.activeElement ?? control);
        return true;
      }
    }
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
  var announce = (info) => {
    const text = options.announce?.(info);
    if (!text) {
      return;
    }
    if (!liveRegion || !liveRegion.isConnected) {
      liveRegion = document.createElement("div");
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
      document.body.appendChild(liveRegion);
    }
    const region = liveRegion;
    region.textContent = "";
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      region.textContent = text;
    }, 50);
  };
  var showSummary = (form, errors) => {
    const container = options.summaryContainer?.(form);
    if (!container || errors.length === 0) {
      return;
    }
    const summary = document.createElement("div");
    const list = document.createElement("ul");
    summary.setAttribute(SUMMARY_ATTRIBUTE, "");
    summary.setAttribute("role", "alert");
    summary.classList.add(...classList(options.classes.feedback), ...classList(options.classes.feedbackVisible));
    errors.forEach(({ message }) => {
      const item = document.createElement("li");
      item.textContent = message;
      list.appendChild(item);
    });
    summary.appendChild(list);
    container.appendChild(summary);
  };
  var dispatchErrors = (target, errors, source, hidden) => {
    target.dispatchEvent(new CustomEvent(ERRORS_EVENT, {
      bubbles: true,
      detail: { errors, source, hidden }
    }));
  };
  var warnHidden = (controls) => {
    if (controls.length && typeof console !== "undefined") {
      console.warn("NetteFormsLive: errors of controls that are not visible", controls.map((control) => control.name));
    }
  };
  var showFormErrors = (form, errors, client = true) => {
    formValidatedAt.set(form, performance.now());
    Array.from(form.elements).filter(isFormControl).forEach((element) => dirty.delete(element));
    clearForm(form);
    const { holders, unplaced } = renderErrors(errors, client);
    dispatchErrors(form, errors, "form", holders.filter((holder) => !isControlVisible(holder)));
    const hidden = holders.filter((holder) => !isControlVisible(holder));
    warnHidden(hidden);
    showSummary(form, [...unplaced, ...errors.filter((error) => isFormControl(error.element) && hidden.includes(ruleHolder(error.element) || error.element))]);
    if (options.focusFirstError) {
      holders.some(focusControl);
    }
    announce({ errors, source: "form", form });
  };
  var requireNette = () => {
    if (!nette) {
      throw new Error("NetteFormsLive: call install() first.");
    }
    return nette;
  };
  var badInputText = (control) => {
    const message = options.badInputMessage;
    if (typeof message === "function") {
      return message(control);
    }
    return message ?? control.validationMessage;
  };
  var checkControl = (holder) => {
    const netteForms = requireNette();
    const saved = netteForms.formErrors;
    netteForms.formErrors = [];
    const disabled = netteForms.isDisabled(holder);
    let valid = disabled || netteForms.validateControl(holder, void 0, false);
    let errors = netteForms.formErrors;
    netteForms.formErrors = saved;
    if (holder.validity.badInput && !disabled) {
      valid = false;
      errors = errors.length ? errors : [{ element: holder, message: badInputText(holder) }];
    }
    return { valid, errors: valid ? [] : errors };
  };
  var renderControlValidation = (holder) => {
    dirty.delete(holder);
    const { valid, errors } = checkControl(holder);
    if (valid) {
      clearControl(holder);
    } else {
      removeServerFeedback(holder, options.feedbackContainer(holder));
      renderErrors(errors.length ? errors : [{ element: holder, message: "" }], true);
    }
    dispatchErrors(holder, errors, "control", valid || isControlVisible(holder) ? [] : [holder]);
    if (holder.form) {
      announce({ errors, source: "control", form: holder.form });
    }
    return valid;
  };
  var validateControl = (control) => {
    const holder = ruleHolder(resolveControl(control));
    return !holder || isIgnored(holder) || renderControlValidation(holder);
  };
  var revalidateClientErrors = (form, except, clearOnly = false) => {
    Array.from(clientErrorsOf(form)).filter((holder) => holder !== except && holder.isConnected && holder.form === form).forEach((holder) => {
      if (!clearOnly) {
        validateControl(holder);
      } else if (checkControl(holder).valid) {
        clearControl(holder);
        dispatchErrors(holder, [], "control", []);
      }
    });
  };
  var handleChange = (element) => {
    const control = resolveControl(element);
    if (!isFormControl(control) || isIgnored(control)) {
      return;
    }
    const holder = ruleHolder(control);
    if (holder && options.validateOn.change) {
      validateControl(holder);
    } else if (hasInvalidClass(control) && !(holder && clientErrorsOf(control.form).has(holder))) {
      clearControl(control);
    }
    revalidateClientErrors(control.form, holder);
  };
  var runLater = (control, action) => {
    if (!pointerPressed) {
      action();
      return;
    }
    if (!pending.has(control)) {
      pending.set(control, { action, at: performance.now() });
    }
  };
  var flushPending = (deferred) => {
    const entries = Array.from(pending.entries());
    pending.clear();
    const run = () => {
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
  var recheckWhileTyping = (holder) => {
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
      dispatchErrors(holder, errors, "control", valid || isControlVisible(holder) ? [] : [holder]);
    } else if (hasInvalidClass(holder)) {
      clearControl(holder);
    }
    revalidateClientErrors(form, holder, true);
  };
  var isSearchInput = (target, control) => target !== control && target instanceof Element && adapters.some((adapter) => adapter.inputEditsValue === false && adapter.originalOf?.(target) === control);
  var onInput = (event) => {
    if (!event.isTrusted || event.isComposing) {
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
    if (options.validateOn.input === "recheck") {
      recheckWhileTyping(holder);
    } else if (options.validateOn.input === "clear") {
      clearControl(holder);
    }
  };
  var onChange = (event) => {
    const control = resolveControl(event.target);
    if (isFormControl(control) && !isSearchInput(event.target, control)) {
      runLater(control, () => {
        handleChange(control);
      });
    }
  };
  var onFocusOut = (event) => {
    const holder = ruleHolder(resolveControl(event.target));
    const mode = options.validateOn.blur;
    if (!mode || !holder || !isTextLike(event.target) || isIgnored(holder)) {
      return;
    }
    if (mode === "dirty" && !dirty.has(holder)) {
      return;
    }
    runLater(holder, () => {
      if (mode !== "dirty" || dirty.has(holder)) {
        validateControl(holder);
      }
    });
  };
  var onPointerDown = (event) => {
    if (event.button === 0) {
      pointerPressed = true;
    }
  };
  var onPointerUp = () => {
    if (pointerPressed) {
      pointerPressed = false;
      flushPending(true);
    }
  };
  var onPressInterrupted = (event) => {
    if (event instanceof KeyboardEvent && MODIFIER_KEYS.includes(event.key)) {
      return;
    }
    if (pointerPressed) {
      pointerPressed = false;
      flushPending(false);
    }
  };
  var onInvalid = (event) => {
    const holder = ruleHolder(event.target);
    if (!holder || !holder.validity.badInput || !holder.form) {
      return;
    }
    event.preventDefault();
    showFormErrors(holder.form, checkControl(holder).errors, true);
  };
  var onReset = (event) => {
    if (event.target instanceof HTMLFormElement && !event.defaultPrevented) {
      Array.from(event.target.elements).filter(isFormControl).forEach((element) => dirty.delete(element));
      clearForm(event.target);
    }
  };
  var mergeOptions = (userOptions) => {
    const { preset: presetOption, ...rest } = userOptions;
    let preset;
    if (typeof presetOption === "string") {
      preset = presets[presetOption];
      if (!preset) {
        throw new Error(`NetteFormsLive: unknown preset "${presetOption}".`);
      }
    } else {
      preset = presetOption;
    }
    const base = { ...defaults, ...preset || {} };
    return {
      ...base,
      ...rest,
      classes: { ...base.classes, ...rest.classes || {} },
      validateOn: { ...base.validateOn, ...rest.validateOn || {} },
      widgets: { ...base.widgets, ...rest.widgets || {} }
    };
  };
  var resolveAdapters = (widgets) => Object.entries(widgets).map(([name, value]) => {
    if (value === true) {
      const builtIn = builtInWidgets[name];
      if (!builtIn) {
        throw new Error(`NetteFormsLive: unknown widget "${name}".`);
      }
      return builtIn;
    }
    return value === false ? null : value;
  }).filter((adapter) => adapter !== null);
  var install = (netteForms, userOptions) => {
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
      document.addEventListener("input", onInput, true);
      document.addEventListener("change", onChange, true);
      document.addEventListener("focusout", onFocusOut, true);
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("pointerup", onPointerUp, true);
      document.addEventListener("pointercancel", onPressInterrupted, true);
      document.addEventListener("contextmenu", onPressInterrupted, true);
      document.addEventListener("dragstart", onPressInterrupted, true);
      document.addEventListener("keydown", onPressInterrupted, true);
      window.addEventListener("blur", onPressInterrupted);
      document.addEventListener("invalid", onInvalid, true);
      document.addEventListener("reset", onReset);
    }
    return NetteFormsLive;
  };
  var clear = (formOrControl) => {
    if (formOrControl instanceof HTMLFormElement) {
      clearForm(formOrControl);
    } else if (isFormControl(formOrControl)) {
      clearControl(formOrControl);
    }
  };
  var showErrors = (form, errors) => {
    showFormErrors(form, errors, false);
  };
  var focusFirstError = (root = document) => {
    const controls = Array.from(root.querySelectorAll("input, select, textarea")).filter(isFormControl).filter((control) => hasInvalidClass(control));
    return controls.some((control) => isControlVisible(control) && focusControl(ruleHolder(control) || control));
  };
  var NetteFormsLive = {
    presets,
    widgets: builtInWidgets,
    install,
    validateControl,
    handleChange,
    clear,
    showErrors,
    focusFirstError
  };
  var nette_forms_live_default = NetteFormsLive;

  // src/global.ts
  window.NetteFormsLive = nette_forms_live_default;
})();
})();
