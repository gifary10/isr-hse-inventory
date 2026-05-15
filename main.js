import { router } from './router.js';
import { hideLoading } from './dom.js';

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        hideLoading();
    }, 1000);
    
    window.addEventListener('hashchange', function() {
        var hash = window.location.hash.slice(1);
        if (hash && router.routes && router.routes[hash]) {
            router.navigate(hash);
        }
    });
});

window.app = { router: router };