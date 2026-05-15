import router from './router.js';
import * as components from './components.js';
import * as services from './services.js';
import { showToast, hideLoading, showLoading, formatDate, formatNumber } from './utils/helpers.js';
import { $, $$, on, delegate, createElement } from './utils/dom.js';

// Initialize data
async function init() {
    try {
        await services.initData();
        hideLoading();
        router.init();
        bindGlobalEvents();
        loadFABActions();
    } catch (error) {
        console.error('Init error:', error);
        hideLoading();
        showToast('Gagal memuat data', 'danger');
    }
}

function bindGlobalEvents() {
    // Back button
    const btnBack = $('#btnBack');
    on(btnBack, 'click', () => {
        router.goBack();
    });

    // Bottom navigation
    $$('.nav-item').forEach(item => {
        on(item, 'click', (e) => {
            const page = item.dataset.page;
            if (page) {
                router.navigate(page);
            }
        });
    });
}

function loadFABActions() {
    const fab = $('#fabMain');
    if (!fab) return;

    on(fab, 'click', () => {
        const currentPage = router.getCurrentPage();
        
        if (currentPage === 'items') {
            components.showItemModal();
        } else if (currentPage === 'stockOpname') {
            components.showStockOpnameModal();
        } else if (currentPage === 'distribution') {
            components.showDistributionModal();
        } else if (currentPage === 'employees') {
            components.showEmployeeModal();
        } else {
            // Show action sheet
            components.showQuickActionSheet();
        }
    });
}

// Expose global functions for components
window.showToast = showToast;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.services = services;
window.components = components;

// Start app
init();