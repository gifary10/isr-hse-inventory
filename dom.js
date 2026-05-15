// DOM Utilities
export function $(selector) {
    return document.querySelector(selector);
}

export function $$(selector) {
    return document.querySelectorAll(selector);
}

export function createElement(tag, className, innerHTML) {
    innerHTML = innerHTML || '';
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
}

export function showLoading(show) {
    show = (show !== undefined) ? show : true;
    var overlay = $('#loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

export function hideLoading() {
    showLoading(false);
}

export function showToast(message, type) {
    type = type || 'info';
    var toastEl = $('#liveToast');
    var toastBody = toastEl.querySelector('.toast-body');
    
    toastEl.classList.remove('text-bg-success', 'text-bg-warning', 'text-bg-danger', 'text-bg-info');
    
    var typeMap = {
        success: 'text-bg-success',
        warning: 'text-bg-warning',
        error: 'text-bg-danger',
        info: 'text-bg-info'
    };
    
    toastEl.classList.add(typeMap[type] || 'text-bg-info');
    toastBody.textContent = message;
    
    var toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}

export function setPageTitle(title) {
    var titleEl = $('#pageTitle');
    if (titleEl) titleEl.textContent = title;
}

export function showBackButton(show) {
    var backBtn = $('#backButton');
    if (backBtn) backBtn.style.display = show ? 'flex' : 'none';
}

export function showFab(show, icon, onClick) {
    icon = icon || 'bi-plus-lg';
    var fab = $('#fabButton');
    if (fab) {
        fab.style.display = show ? 'flex' : 'none';
        if (icon) {
            var iconEl = fab.querySelector('i');
            if (iconEl) iconEl.className = 'bi ' + icon;
        }
        if (onClick) {
            fab.onclick = onClick;
        }
    }
}

export function renderContent(html) {
    var main = $('#mainContent');
    if (main) main.innerHTML = html;
}

export function formatDate(date, format) {
    format = format || 'datetime';
    var d = new Date(date);
    if (format === 'date') {
        return d.toLocaleDateString('id-ID');
    } else if (format === 'time') {
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } else {
        return d.toLocaleString('id-ID');
    }
}

export function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}