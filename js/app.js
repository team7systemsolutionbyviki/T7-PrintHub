/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - MAIN APPLICATION ENTRY POINT
   Firebase-Only Engine: Real-Time Shop Settings Synchronization
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
window.updateFloatingButtons = () => {
  try {
    const settings = DBService.getSettingsSync();
    const rawWa   = (settings.whatsappNumber || settings.phone || '').replace(/\D/g, '');
    const cleanWa = rawWa.length === 10 ? '91' + rawWa : rawWa;
    const waBtn   = document.getElementById('floating-whatsapp-btn');
    if (waBtn && cleanWa) {
      waBtn.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent(`Hi ${settings.shopName || 'Shop'}! I have a printing inquiry.`)}`;
    }

    const rawPhone  = (settings.phone || '').replace(/\D/g, '');
    const cleanCall = rawPhone.length === 10 ? '+91' + rawPhone : (rawPhone ? '+' + rawPhone : '');
    const callBtn   = document.getElementById('floating-call-btn');
    if (callBtn && cleanCall) {
      callBtn.href = `tel:${cleanCall}`;
    }
  } catch (e) {
    console.warn('[App] updateFloatingButtons:', e);
  }
};

// ── Central Shop Settings UI Refresh Engine ──────────────────────────────────
window.refreshShopSettingsUI = (settings) => {
  const data = settings || DBService.getSettingsSync();

  // 1. Update Document Title
  if (data.shopName) {
    document.title = `${data.shopName} | Online Document Printing & Management`;
  }

  // 2. Re-render Navbar and Footer brand/links
  NavbarComponent.render();

  // 3. Update Floating Action Buttons
  window.updateFloatingButtons();

  // 4. Update DOM elements with data-shop-setting attributes
  document.querySelectorAll('[data-shop-setting]').forEach(el => {
    const field = el.dataset.shopSetting;
    const val = data[field];
    if (val !== undefined && val !== null) {
      if (el.tagName === 'IFRAME') {
        if (field === 'googleMapUrl' || field === 'googleMapEmbedUrl') {
          el.src = val;
        }
      } else if (el.tagName === 'A') {
        if (field === 'phone' || field === 'supportPhone') {
          const raw = String(val).replace(/\D/g, '');
          el.href = `tel:${raw.length === 10 ? '+91' + raw : '+' + raw}`;
          el.textContent = `📞 ${val}`;
        } else if (field === 'email' || field === 'contactEmail') {
          el.href = `mailto:${val}`;
          el.textContent = `✉️ ${val}`;
        } else if (field === 'whatsappNumber' || field === 'whatsapp') {
          const rawWa = String(val).replace(/\D/g, '');
          const cleanWa = rawWa.length === 10 ? '91' + rawWa : rawWa;
          el.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent(`Hi ${data.shopName || 'Shop'}! I have an inquiry.`)}`;
        }
      } else {
        el.textContent = val;
      }
    }
  });

  // 5. Re-render active public route if currently visible to capture component template updates
  const currentHash = (window.location.hash || '#home').slice(1).split('?')[0];
  const publicRoutes = ['home', 'services', 'pricing', 'how-it-works', 'faq', 'order', 'track', 'contact', ''];
  if (publicRoutes.includes(currentHash)) {
    Router.handleRoute();
  }

  console.log('[APP] Shop Settings UI refreshed:', data);
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

    // Listen for settingsUpdated event — triggered on Admin save or snapshot
    window.addEventListener('settingsUpdated', (event) => {
      const settings = event.detail || DBService.getSettingsSync();
      console.log('[APP] settingsUpdated received:', settings);
      window.refreshShopSettingsUI(settings);
    });

    // Admin updated catalog → re-render home/services pages
    window.addEventListener('catalogUpdated', () => {
      const currentHash = (window.location.hash || '#home').slice(1).split('?')[0];
      if (currentHash === 'home' || currentHash === 'services') {
        Router.handleRoute();
      }
    });

    // ── Step 3: Show a loading indicator while Firebase warms up ─────────────
    showLoader();

    // ── Step 4: AWAIT Firebase init + settings load BEFORE first render ───────
    console.log('[APP] Waiting for Firebase Shop Settings...');
    try {
      await initFirebase();
      await DBService.getSettings(true); // Force fresh fetch from Firebase server
      console.log('[APP] Firebase Shop Settings loaded');
    } catch (firebaseErr) {
      console.warn('[APP] Firebase init failed, using defaults:', firebaseErr);
    }

    // ── Step 5: RENDER the application ────────────────────────────────────────
    hideLoader();
    console.log('[APP] Rendering application');
    Router.init();
    window.refreshShopSettingsUI();

    // ── Step 6: Start real-time Firestore listener for cross-tab & cross-device updates ──
    DBService.onSettingsSnapshot((settings) => {
      console.log('[APP] Firebase Shop Settings changed:', settings);
      window.refreshShopSettingsUI(settings);
    }).catch(e => console.warn('[App] Snapshot err:', e));

    // ── Step 7: Warm up other caches in background (non-blocking) ────────────
    Promise.allSettled([
      DBService.getOrders(),
      PricingEngine.preload(DBService)
    ]).catch(() => {});

  } catch (err) {
    console.error('[App] Critical init error:', err);
    try { Router.init(); } catch (e) {}
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
