import { CONFIG } from './config.js';

export function debounce(func, wait) {
    var timeout;
    return function executedFunction() {
        var context = this;
        var args = arguments;
        var later = function() {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function getCategoryName(categoryId) {
    var cat = CONFIG.CATEGORIES.find(function(c) { return c.id === categoryId; });
    return cat ? cat.name : 'Unknown';
}

export function getCategoryIcon(categoryId) {
    var cat = CONFIG.CATEGORIES.find(function(c) { return c.id === categoryId; });
    return cat ? cat.icon : 'bi-box';
}

export function getStockStatus(current, min) {
    if (current <= 0) return { class: 'danger', text: 'Habis' };
    if (current < min) return { class: 'warning', text: 'Menipis' };
    return { class: 'success', text: 'Aman' };
}

export function validateForm(data, rules) {
    var errors = [];
    for (var field in rules) {
        var rule = rules[field];
        var value = data[field];
        if (rule.required && (!value || value === '')) {
            errors.push(rule.label + ' wajib diisi');
        }
        if (rule.min && value < rule.min) {
            errors.push(rule.label + ' minimal ' + rule.min);
        }
        if (rule.max && value > rule.max) {
            errors.push(rule.label + ' maksimal ' + rule.max);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(rule.label + ' tidak valid');
        }
    }
    
    if (errors.length > 0) {
        import('./dom.js').then(function(dom) {
            dom.showToast(errors[0], 'error');
        });
        return false;
    }
    return true;
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}