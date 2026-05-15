import { renderDashboard } from './dashboard.js';
import { renderStockOpname } from './stockOpname.js';
import { renderDistribution } from './distribution.js';
import { renderHistory } from './history.js';
import { renderItems } from './items.js';
import { showBackButton, setPageTitle, showFab } from './dom.js';

class Router {
    constructor() {
        this.routes = {
            dashboard: { render: renderDashboard, title: 'Dashboard', showFab: false, fabIcon: null },
            items: { render: renderItems, title: 'Master Item', showFab: false, fabIcon: null },
            opname: { render: renderStockOpname, title: 'Stok Opname', showFab: false, fabIcon: null },
            distribution: { render: renderDistribution, title: 'Distribusi', showFab: false, fabIcon: null },
            history: { render: renderHistory, title: 'History', showFab: false, fabIcon: null }
        };
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        var self = this;
        
        document.querySelectorAll('.nav-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                var page = item.dataset.page;
                if (page) self.navigate(page);
            });
        });
        
        var backBtn = document.getElementById('backButton');
        if (backBtn) {
            backBtn.addEventListener('click', function() {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    self.navigate('dashboard');
                }
            });
        }
        
        this.navigate('dashboard');
    }

    async navigate(page, params) {
        params = params || {};
        var route = this.routes[page];
        if (!route) {
            this.navigate('dashboard');
            return;
        }
        
        this.currentPage = page;
        setPageTitle(route.title);
        showBackButton(false);
        showFab(route.showFab, route.fabIcon, route.fabAction);
        
        document.querySelectorAll('.nav-item').forEach(function(item) {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        await route.render(params);
        
        window.location.hash = page;
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

export var router = new Router();