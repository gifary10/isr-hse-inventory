export function $(selector) {
    return document.querySelector(selector);
}

export function $$(selector) {
    return document.querySelectorAll(selector);
}

export function createElement(tag, className = '', attributes = {}, innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

export function on(element, event, handler, options = {}) {
    if (element) {
        element.addEventListener(event, handler, options);
    }
}

export function delegate(parent, selector, event, handler) {
    if (!parent) return;
    parent.addEventListener(event, (e) => {
        const target = e.target.closest(selector);
        if (target && parent.contains(target)) {
            handler(e, target);
        }
    });
}

export function setText(selector, text) {
    const element = $(selector);
    if (element) element.textContent = text;
}

export function show(element) {
    if (element) element.style.display = '';
}

export function hide(element) {
    if (element) element.style.display = 'none';
}

export function addClass(element, className) {
    if (element) element.classList.add(className);
}

export function removeClass(element, className) {
    if (element) element.classList.remove(className);
}

export function toggleClass(element, className) {
    if (element) element.classList.toggle(className);
}