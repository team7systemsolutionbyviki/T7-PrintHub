/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - MAIN APPLICATION ENTRY POINT
   Firebase-Only Engine: Firebase settings loaded BEFORE first render
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
// Only called AFTER _settingsCache is warm (from Firebase), so getSettingsSync()
// returns correct Firebase values, never DEFAULT_SETTINGS on real renders.
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

// ── Loading screen helpers ────────────────────────────────────────────────────
function showLoader() {
  const app = document.getElementById('app-content');
  if (app) {
    app.innerHTML = `
      <div style="
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        min-height:60vh; gap:1.25rem; padding:2rem; text-align:center;
      ">
        <div style="
          width:52px; height:52px; border:4px solid var(--border-color);
          border-top-color:var(--primary); border-radius:50%;
          animation:spin 0.8s linear infinite;
        "></div>
        <p style="color:var(--text-muted); font-size:0.95rem; margin:0;">Loading shop information…</p>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `;
  }
}

function hideLoader() {
  // Router.init() will overwrite app-content immediately — nothing to do.
}

// ── Main application entry point ──────────────────────────────────────────────
const initApp = async () => {
  try {
    // ── Step 1: Register all SPA routes ──────────────────────────────────────
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

    // ── Step 2: Register global event listeners ───────────────────────────────

    // I18n language change → re-render current page
    I18nService.onChange(() => {
      NavbarComponent.render();
      Router.handleRoute();
    });

    // Admin saved settings → re-render public pages instantly with new data
    window.addEventListener('settingsUpdated', () => {
      NavbarComponent.render();
      window.updateFloatingButtons();
      const currentHash = (window.location.hash || '#home').slice(1).split('?')[0];
      const publicRoutes = ['home', 'services', 'pricing', 'how-it-works', 'faq', 'order', 'track', 'contact', ''];
      if (publicRoutes.includes(currentHash)) {
        Router.handleRoute();
      }
    });

    // Admin updated catalog → re-render home/services pages
    window.addEventListener('catalogUpdated', () => {
      const currentHash = (window.location.hash || '#home').slice(1).split('?')[0];
      if (currentHash === 'home' || currentHash === 'services') {
        Router.handleRoute();
      }
    });

    // ── Step 3: Show a loading indicator while Firebase warms up ─────────────
    // This prevents any flash of DEFAULT_SETTINGS before Firebase loads.
    showLoader();

    // ── Step 4: AWAIT Firebase init + settings load BEFORE first render ───────
    // This is the critical fix: _settingsCache is populated with REAL Firebase
    // data before Router.init() calls getSettingsSync() for the first time.
    console.log('[APP] Waiting for Firebase Shop Settings...');
    try {
      await initFirebase();
      await DBService.getSettings(true); // Force fresh fetch from Firebase server
      console.log('[APP] Firebase Shop Settings loaded');
    } catch (firebaseErr) {
      // Firebase unavailable — proceed with defaults so app still renders
      console.warn('[APP] Firebase init failed, using defaults:', firebaseErr);
    }

    // ── Step 5: RENDER the application — getSettingsSync() is now warmed ─────
    // _settingsCache contains real Firebase data, not DEFAULT_SETTINGS.
    // No flash, no alternating, no stale data.
    hideLoader();
    console.log('[APP] Rendering application');
    Router.init();
    window.updateFloatingButtons();

    // ── Step 6: Start real-time Firestore listener for subsequent updates ─────
    // Keeps the UI live: any admin save → onSnapshot → settingsUpdated → re-render
    DBService.onSettingsSnapshot().catch(e => console.warn('[App] Snapshot err:', e));

    // ── Step 7: Warm up other caches in background (non-blocking) ────────────
    Promise.allSettled([
      DBService.getOrders(),
      PricingEngine.preload(DBService)
    ]).catch(() => {});

  } catch (err) {
    console.error('[App] Critical init error:', err);
    // Last-resort fallback — render with whatever data is available
    try { Router.init(); } catch (e) {}
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
