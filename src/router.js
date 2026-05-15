import { renderDashboard } from './modules/dashboard.js';
import { renderItems } from './modules/items.js';
import { renderStockOpname } from './modules/stockOpname.js';
import { renderDistribution } from './modules/distribution.js';
import { renderHistory } from './modules/history.js';
import { renderMonitoring } from './modules/monitoring.js';
import { renderEmployees } from './modules/employees.js';
import { $, $$, setText, show, hide } from './utils/dom.js';

const routes = {
    dashboard: { title: 'Dashboard', render: renderDashboard, showBack: false },
    items: { title: 'Master Item', render: renderItems, showBack: false },
    stockOpname: { title: 'Stock Opname', render: renderStockOpname, showBack: false },
    distribution: { title: 'Distribusi Item', render: renderDistribution, showBack: false },
    history: { title: 'Histori & Laporan', render: renderHistory, showBack: false },
    monitoring: { title: 'Monitoring Stok', render: renderMonitoring, showBack: true },
    employees: { title: 'Data Karyawan', render: renderEmployees, showBack: true }
};

let currentPage = 'dashboard';
let historyStack = [];

class Router {
    init() {
        // Load initial page
        this.navigate('dashboard');
        
        // Handle browser back button
        window.addEventListener('popstate', (e) => {
            const state = e.state;
            if (state && state.page) {
                this.loadPage(state.page, false);
            } else {
                this.loadPage('dashboard', false);
            }
        });
    }
    
    navigate(page, addToHistory = true) {
        if (addToHistory && currentPage !== page) {
            historyStack.push(currentPage);
            window.history.pushState({ page }, '', `#${page}`);
        }
        this.loadPage(page, addToHistory);
    }
    
    goBack() {
        if (historyStack.length > 0) {
            const prevPage = historyStack.pop();
            window.history.back();
            this.loadPage(prevPage, false);
        } else if (currentPage !== 'dashboard') {
            this.navigate('dashboard');
        }
    }
    
    loadPage(page, updateHistory = true) {
        const route = routes[page];
        if (!route) {
            this.navigate('dashboard');
            return;
        }
        
        currentPage = page;
        
        // Update header
        setText('#headerTitle', route.title);
        const btnBack = $('#btnBack');
        if (route.showBack) {
            show(btnBack);
        } else {
            hide(btnBack);
        }
        
        // Update active nav
        $$('.nav-item').forEach(item => {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Show/hide FAB based on page
        const fab = $('#fabMain');
        const fabPages = ['items', 'stockOpname', 'distribution', 'employees'];
        if (fabPages.includes(page)) {
            show(fab);
        } else {
            hide(fab);
        }
        
        // Render page
        const container = $('#pageContainer');
        if (container) {
            route.render(container, () => {
                if (updateHistory && page !== currentPage) {
                    // callback after render
                }
            });
        }
    }
    
    getCurrentPage() {
        return currentPage;
    }
}

const router = new Router();
export default router;