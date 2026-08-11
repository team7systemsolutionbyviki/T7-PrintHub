/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - MAIN APPLICATION ENTRY POINT
   Firebase-Only Engine: No localStorage for app data
   ========================================================================== */

import { initFirebase } from './config/firebase-config.js';
import { Router } from './utils/router.js';
import { NavbarComponent } from './components/navbar.js';
import { PublicViews } from './views/public-views.js';
import { AdminViews } from './views/admin-views.js';
import { CustomerViews } from './views/customer-views.js';
import { DBService } from './services/db-service.js';
import { PricingEngine } from './services/pricing-engine.js';
import { ModalComponent } from './components/modal.js';
import { NotificationService } from './services/notification-service.js';
import { I18nService } from './services/i18n-service.js';

window.ModalComponent = ModalComponent;
window.NotificationService = NotificationService;
window.I18nService = I18nService;

// ── Floating buttons ──────────────────────────────────────────────────────────
// Uses getSettingsSync() since this is only called:
// (a) synchronously at startup (cache = defaults, OK)
// (b) from settingsUpdated event (cache = Firebase server data, correct)
window.updateFloatingButtons = () => {
  try {
    const settings = DBService.getSettingsSync();
    const rawWa   = (settings.whatsappNumber || settings.phone || '').replace(/\D/g, '');
    const cleanWa = rawWa.length === 10 ? '91' + rawWa : rawWa;
    const waBtn   = document.getElementById('floating-whatsapp-btn');
    if (waBtn && cleanWa) waBtn.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent(`Hi ${settings.shopName}! I have a printing inquiry.`)}`;

    const rawPhone  = (settings.phone || '').replace(/\D/g, '');
    const cleanCall = rawPhone.length === 10 ? '+91' + rawPhone : (rawPhone ? '+' + rawPhone : '');
    const callBtn   = document.getElementById('floating-call-btn');
    if (callBtn && cleanCall) callBtn.href = `tel:${cleanCall}`;
  } catch (e) {
    console.warn('[App] updateFloatingButtons:', e);
  }
};

const initApp = () => {
  try {
    // ── Step 1: Register all SPA routes IMMEDIATELY for instant UI rendering ──
    Router.register('home',        (q) => { NavbarComponent.render(); PublicViews.renderHome(q);      window.updateFloatingButtons(); });
    Router.register('services',    (q) => { NavbarComponent.render(); PublicViews.renderServices(q);  window.updateFloatingButtons(); });
    Router.register('pricing',     (q) => { NavbarComponent.render(); PublicViews.renderPriceList(q); window.updateFloatingButtons(); });
    Router.register('how-it-works', async (q) => {
      NavbarComponent.render();
      await PublicViews.renderHome(q);
      setTimeout(() => {
        const el = document.getElementById('how-it-works-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
      window.updateFloatingButtons();
    });
    Router.register('faq',     (q) => { NavbarComponent.render(); PublicViews.renderFAQ(q);         window.updateFloatingButtons(); });
    Router.register('order',   (q) => { NavbarComponent.render(); PublicViews.renderOrderPrint(q);  window.updateFloatingButtons(); });
    Router.register('track',   (q) => { NavbarComponent.render(); PublicViews.renderTrackOrder(q);  window.updateFloatingButtons(); });
    Router.register('contact', (q) => { NavbarComponent.render(); PublicViews.renderContact(q);     window.updateFloatingButtons(); });

    // Admin Routes
    Router.register('admin-login',        (q) => { NavbarComponent.render(); AdminViews.renderLogin(q); });
    Router.register('admin-dashboard',    (q) => { AdminViews.renderDashboard(q); });
    Router.register('admin-orders',       (q) => { AdminViews.renderOrders(q); });
    Router.register('admin-pricing',      (q) => { AdminViews.renderPricing(q); });
    Router.register('admin-catalog',      (q) => { AdminViews.renderCatalog(q); });
    Router.register('admin-customers',    (q) => { AdminViews.renderCustomers(q); });
    Router.register('admin-reports',      (q) => { AdminViews.renderReports(q); });
    Router.register('admin-settings',     (q) => { AdminViews.renderSettings(q); });

    // Customer Route
    Router.register('customer-dashboard', (q) => { NavbarComponent.render(); CustomerViews.renderCustomerDashboard(q); });

    // ── Step 2: Register I18n change listener ─────────────────────────────────
    I18nService.onChange(() => {
      NavbarComponent.render();
      Router.handleRoute();
    });

    // ── Step 3: Start router FIRST so page content renders in < 1ms ──────────
    Router.init();
    window.updateFloatingButtons();

    // ── Listen for settings saved by admin — refresh public pages live ─────────
    window.addEventListener('settingsUpdated', () => {
      NavbarComponent.render();
      window.updateFloatingButtons();
      const currentHash = (window.location.hash || '#home').slice(1).split('?')[0];
      const publicRoutes = ['home', 'services', 'pricing', 'how-it-works', 'faq', 'order', 'track', 'contact', ''];
      if (publicRoutes.includes(currentHash)) {
        Router.handleRoute();
      }
    });

    // ── Listen for catalog changes — refresh home/services pages ──────────────
    window.addEventListener('catalogUpdated', () => {
      const currentHash = (window.location.hash || '#home').slice(1).split('?')[0];
      if (currentHash === 'home' || currentHash === 'services') {
        Router.handleRoute();
      }
    });

    // ── Step 4: Background Firebase load + real-time settings listener ────────
    // initFirebase() loads the SDK asynchronously without blocking the UI.
    // Once ready, we subscribe to the Firestore settings document with onSnapshot()
    // so any admin save immediately propagates to all public pages in real time.
    initFirebase().then(async () => {
      try {
        // Warm up caches for orders and pricing in parallel
        await Promise.allSettled([
          DBService.getOrders(),
          PricingEngine.preload(DBService)
        ]);

        // Subscribe to real-time Firestore settings listener.
        // This replaces the one-shot getSettings() call and keeps settings live
        // so admin changes are reflected on public pages without any manual refresh.
        await DBService.onSettingsSnapshot();

        NavbarComponent.render();
        window.updateFloatingButtons();
      } catch (err) {
        console.warn('[App] Deferred Firebase init error:', err);
      }
    }).catch(err => console.warn('[App] Firebase init failed:', err));

  } catch (err) {
    console.error('App init error:', err);
    try { Router.init(); } catch (e) {}
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
