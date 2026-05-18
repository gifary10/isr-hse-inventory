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

// Registrasi Service Worker (jika belum didaftarkan di index.html, pastikan tidak dobel)
// Tapi karena sudah di index.html, kita tambahkan handler update saja.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Tawarkan reload ke user
                    if (confirm('Update tersedia. Muat ulang halaman untuk menggunakan versi terbaru?')) {
                        window.location.reload();
                    }
                }
            });
        });
    });
}

window.app = { router: router };