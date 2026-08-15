/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - ADMIN VIEWS MODULE
   ========================================================================== */

import { AuthService } from '../services/auth-service.js';
import { DBService } from '../services/db-service.js';
import { StorageService } from '../services/storage-service.js';
import { AWBDispatchService } from '../services/awb-dispatch-service.js';
import { PricingEngine } from '../services/pricing-engine.js';
import { NotificationService } from '../services/notification-service.js';
import { ChartsEngine } from '../components/charts.js';
import { InvoiceComponent } from '../components/invoice.js';
import { ModalComponent } from '../components/modal.js';
import { formatCurrency, getStatusBadgeHTML, formatDate, formatTime } from '../utils/formatters.js';
import { exportToCSV } from '../utils/export-excel.js';
import { getServices, initFirebase, firebaseConfig } from '../config/firebase-config.js';
import { PublicViews } from './public-views.js';

export const AdminViews = {
  // --- ADMIN LOGIN PAGE ---
  renderLogin() {
    const app = document.getElementById('app-content');
    app.innerHTML = `
      <section style="min-height:80vh; display:flex; align-items:center; justify-content:center; padding:2.5rem 1rem;">
        <div class="glass-panel glow-effect" style="width:100%; max-width:440px; padding:2.5rem; border-radius:16px;">
          <div class="text-center mb-4">
            <div class="nav-brand-logo" style="margin:0 auto 1rem; width:58px; height:58px; font-size:1.8rem; background:linear-gradient(135deg, var(--primary), var(--accent)); color:white; border-radius:14px; display:flex; align-items:center; justify-content:center; font-weight:800;">T7</div>
            <h2 style="font-size:1.85rem; font-weight:800;">Admin Portal</h2>
            <p class="text-muted" style="font-size:0.875rem; margin-top:0.25rem;">Management Portal Sign In</p>
          </div>

          <form id="admin-login-form">
            <div class="form-group mb-3">
              <label class="form-label" style="font-weight:600;">Admin Username / Email</label>
              <input type="text" class="form-control" id="login-email" value="" placeholder="Enter Username / Email" required autofocus>
            </div>

            <div class="form-group mb-4">
              <label class="form-label" style="font-weight:600;">Password</label>
              <input type="password" class="form-control" id="login-password" value="" placeholder="Enter Password" required>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full glow-effect" style="font-weight:700;">Sign In to Admin Dashboard ➔</button>
          </form>
        </div>
      </section>
    `;

    document.getElementById('admin-login-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      const res = await AuthService.loginAdmin(email, password);
      if (res.success) {
        NotificationService.showToast('Welcome back, Administrator!', 'success');
        window.location.hash = '#admin-dashboard';
      } else {
        NotificationService.showToast(res.message, 'error');
      }
    };
  },

  // Helper Layout Wrapper for Admin Portal
  async renderAdminLayout(activeTab, contentHTML) {
    const user = AuthService.getCurrentUser();
    const settings = await DBService.getSettings(); // uses in-memory cache — instant
    const brandLogoText = (settings.shopName || 'SHOP').slice(0, 2).toUpperCase();
    const brandName = settings.shopName || 'Admin Portal';
    const app = document.getElementById('app-content');

    if (!app) return;

    app.innerHTML = `
      <div class="admin-sidebar-overlay" id="admin-sidebar-overlay"></div>
      <div class="dashboard-wrapper">
        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="admin-sidebar">
          <div class="sidebar-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:0.75rem; overflow:hidden;">
              <div class="nav-brand-logo" style="width:34px; height:34px; font-size:1.1rem; flex-shrink:0;">${brandLogoText}</div>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${brandName}">${brandName}</span>
            </div>
            <button id="admin-sidebar-close" style="background:transparent; border:none; font-size:1.3rem; cursor:pointer; color:var(--text-muted); padding:0.25rem;">✕</button>
          </div>

          <div class="sidebar-nav">
            <a href="#admin-dashboard" class="sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}">
              <span class="sidebar-link-icon">📊</span> Overview Dashboard
            </a>
            <a href="#admin-orders" class="sidebar-link ${activeTab === 'orders' ? 'active' : ''}">
              <span class="sidebar-link-icon">📄</span> Order Pipeline
            </a>
            <a href="#admin-pricing" class="sidebar-link ${activeTab === 'pricing' ? 'active' : ''}">
              <span class="sidebar-link-icon">🏷️</span> Price Manager
            </a>
            <a href="#admin-catalog" class="sidebar-link ${activeTab === 'catalog' ? 'active' : ''}">
              <span class="sidebar-link-icon">📚</span> Service Catalog (CRUD)
            </a>
            <a href="#admin-customers" class="sidebar-link ${activeTab === 'customers' ? 'active' : ''}">
              <span class="sidebar-link-icon">👥</span> Customer Directory
            </a>
            <a href="#admin-reports" class="sidebar-link ${activeTab === 'reports' ? 'active' : ''}">
              <span class="sidebar-link-icon">📈</span> Reports & Analytics
            </a>
            <a href="#admin-reports?view=bookings" class="sidebar-link ${activeTab === 'booking-reports' ? 'active' : ''}">
              <span class="sidebar-link-icon">📅</span> Booking Report
            </a>
            <a href="#admin-settings" class="sidebar-link ${activeTab === 'settings' ? 'active' : ''}">
              <span class="sidebar-link-icon">⚙️</span> Shop Settings
            </a>
            <a href="#admin-about" class="sidebar-link ${activeTab === 'about' ? 'active' : ''}">
              <span class="sidebar-link-icon">ℹ️</span> About Page Editor
            </a>
            <a href="#admin-firebase-diagnostic" class="sidebar-link ${activeTab === 'firebase-diagnostic' ? 'active' : ''}">
              <span class="sidebar-link-icon">🔥</span> Firebase Diagnostic
            </a>
          </div>

          <div class="sidebar-footer">
            <button class="btn btn-sm btn-outline w-full" id="admin-logout-btn">🚪 Sign Out</button>
          </div>
        </aside>

        <!-- Main Dashboard Body -->
        <main class="dashboard-main">
          <header class="dashboard-topbar">
            <div style="display:flex; align-items:center; gap:0.85rem;">
              <button class="admin-sidebar-toggle" id="admin-sidebar-toggle" title="Toggle Navigation Menu">☰</button>
              <div style="font-weight:700; font-size:1.1rem; font-family:'Outfit', sans-serif;">
                ${settings.shopName}
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:1rem;">
              <span class="badge badge-approved">● Live System</span>
              <div style="font-size:0.875rem; font-weight:600;">👤 ${user?.displayName || 'Administrator'}</div>
            </div>
          </header>

          <div class="dashboard-content">
            ${contentHTML}
          </div>
        </main>
      </div>
    `;

    // Mobile Sidebar Drawer Handlers
    const adminSidebar = document.getElementById('admin-sidebar');
    const adminOverlay = document.getElementById('admin-sidebar-overlay');
    const adminToggle = document.getElementById('admin-sidebar-toggle');
    const adminClose = document.getElementById('admin-sidebar-close');

    const openAdminSidebar = () => {
      adminSidebar?.classList.add('active');
      adminOverlay?.classList.add('active');
    };

    const closeAdminSidebar = () => {
      adminSidebar?.classList.remove('active');
      adminOverlay?.classList.remove('active');
    };

    if (adminToggle) adminToggle.onclick = openAdminSidebar;
    if (adminClose) adminClose.onclick = closeAdminSidebar;
    if (adminOverlay) adminOverlay.onclick = closeAdminSidebar;

    // Close mobile admin sidebar when any link is clicked
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', closeAdminSidebar);
    });

    document.getElementById('admin-logout-btn').onclick = async () => {
      await AuthService.logout();
      NotificationService.showToast('Signed out successfully.', 'info');
      window.location.hash = '#home';
    };
  },

  // --- OVERVIEW DASHBOARD ---
  async renderDashboard() {
    const orders = await DBService.getOrders(); // uses in-memory cache — instant

    // Metrics Calculations (Excludes Rejected orders from Net Revenue / Gain Amount)
    const validOrders = orders.filter(o => o.status !== 'Rejected');
    const rejectedOrders = orders.filter(o => o.status === 'Rejected');

    const todayRevenue = validOrders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0);
    const pendingVerification = orders.filter(o => o.status === 'Waiting Verification').length;
    const printingQueue = orders.filter(o => o.status === 'Printing').length;
    const rejectedCount = rejectedOrders.length;

    const html = `
      <!-- Metric Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background:rgba(99,102,241,0.15); color:var(--primary);">💰</div>
          <div>
            <div class="metric-val">${formatCurrency(todayRevenue)}</div>
            <div class="metric-title">Net Revenue (Gain Amount)</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:rgba(59,130,246,0.15); color:#2563eb;">📄</div>
          <div>
            <div class="metric-val">${validOrders.length}</div>
            <div class="metric-title">Valid Orders ${rejectedCount > 0 ? `<span style="font-size:0.75rem; color:#ef4444;">(${rejectedCount} rejected)</span>` : ''}</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:rgba(245,158,11,0.15); color:#d97706;">⏳</div>
          <div>
            <div class="metric-val" style="color:#d97706;">${pendingVerification}</div>
            <div class="metric-title">Pending Verification</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon" style="background:rgba(139,92,246,0.15); color:#7c3aed;">🖨️</div>
          <div>
            <div class="metric-val" style="color:#7c3aed;">${printingQueue}</div>
            <div class="metric-title">Printing Queue</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3>📈 Sales Revenue Trend</h3>
            <span class="text-muted" style="font-size:0.8rem;">Weekly Overview</span>
          </div>
          <div id="chart-revenue-container" class="chart-canvas-container"></div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3>📊 Print Services breakdown</h3>
          </div>
          <div id="chart-services-container" style="height:240px;"></div>
        </div>
      </div>

      <!-- Recent Orders Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <h3>Recent Orders</h3>
          <a href="#admin-orders" class="btn btn-sm btn-outline">View All Pipeline →</a>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>PDF Documents</th>
                <th>Specs & Copies</th>
                <th>Amount</th>
                <th>Payment UTR</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.slice(0, 5).map(o => {
      const filesList = (o.files && o.files.length > 0) ? o.files : (o.file ? [o.file] : []);
      return `
                <tr>
                  <td><b>${o.id}</b></td>
                  <td>${o.customerName || 'Customer'}<br><span class="text-muted" style="font-size:0.8rem;">${o.customerPhone || 'N/A'}</span></td>
                  <td>
                    ${filesList.map((f, idx) => `
                      <div style="font-size:0.8rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;" title="${f.name || 'Document.pdf'}">
                        📄 ${f.name || `Document_${idx + 1}.pdf`} <span style="font-size:0.7rem; color:var(--text-muted);">(${f.pages || 1} pgs)</span>
                      </div>
                    `).join('')}
                  </td>
                  <td>
                    ${filesList.map((f, idx) => `
                      <div style="font-size:0.75rem;">
                        ${filesList.length > 1 ? `<b>Doc ${idx + 1}:</b> ` : ''}${(f.options || o.options)?.paperSize || 'A4'} • ${(f.options || o.options)?.colorMode || 'B&W'} • ${(f.options || o.options)?.copies || 1} copy
                      </div>
                    `).join('')}
                  </td>
                  <td><b>${formatCurrency(o.pricing?.total)}</b></td>
                  <td><code>${o.payment?.utr || 'N/A'}</code></td>
                  <td>${getStatusBadgeHTML(o.status)}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="window.location.hash='#admin-orders?id=${o.id}'">Inspect</button>
                  </td>
                </tr>
              `;
    }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.renderAdminLayout('dashboard', html);

    // Render Charts
    setTimeout(() => {
      ChartsEngine.renderRevenueLineChart('chart-revenue-container');
      ChartsEngine.renderBarChart('chart-services-container');
    }, 100);
  },

  // --- ORDERS MANAGEMENT PIPELINE ---
  async renderOrders(queryStr = '') {
    // Load in parallel — both hit in-memory cache after first load
    const [orders, settings] = await Promise.all([
      DBService.getOrders(),
      DBService.getSettings()
    ]);

    const paramId = new URLSearchParams(queryStr).get('id') || '';

    // Check if viewing single printable invoice
    const paramInvoice = new URLSearchParams(queryStr).get('invoice');
    if (paramInvoice) {
      const order = orders.find(o => o.id === paramInvoice);
      if (order) {
        document.getElementById('app-content').innerHTML = InvoiceComponent.renderHTML(order, settings);
        return;
      }
    }

    const html = `
      <div class="table-card mb-4">
        <div class="table-toolbar" style="flex-direction:column; align-items:stretch; gap:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
              <h3 style="margin:0;">Order Management Pipeline (<span id="pipeline-total-count">${orders.length}</span> orders)</h3>
              <p class="text-muted" style="font-size:0.85rem; margin-top:0.25rem;">Live order processing queue & status workflow management</p>
            </div>
            
            <div style="display:flex; gap:0.75rem; align-items:center;">
              <input type="text" class="form-control" id="order-search-field" placeholder="Search ID, Name, Phone, UTR..." value="${paramId}">
              <select class="form-select" id="order-status-filter" style="width:200px;">
                <option value="">All Statuses</option>
                <option value="Waiting Verification">⏳ Waiting Verification</option>
                <option value="Payment Approved">💳 Payment Approved</option>
                <option value="Printing">🖨️ Printing</option>
                <option value="Ready for Pickup">📦 Ready for Pickup</option>
                <option value="Completed">✅ Completed</option>
                <option value="Rejected">❌ Rejected</option>
              </select>
            </div>
          </div>

          <!-- Quick Status Filter Pills Bar -->
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; border-top:1px solid var(--border-color); padding-top:0.85rem;" id="pipeline-status-pills">
            <button class="btn btn-sm btn-outline active-pill" id="pill-all" onclick="window.filterPipelineByPill('')">All (<span id="count-all">${orders.length}</span>)</button>
            <button class="btn btn-sm btn-outline" id="pill-waiting" onclick="window.filterPipelineByPill('Waiting Verification')">⏳ Waiting (<span id="count-waiting">${orders.filter(o => o.status === 'Waiting Verification').length}</span>)</button>
            <button class="btn btn-sm btn-outline" id="pill-approved" onclick="window.filterPipelineByPill('Payment Approved')">💳 Approved (<span id="count-approved">${orders.filter(o => o.status === 'Payment Approved').length}</span>)</button>
            <button class="btn btn-sm btn-outline" id="pill-printing" onclick="window.filterPipelineByPill('Printing')">🖨️ Printing (<span id="count-printing">${orders.filter(o => o.status === 'Printing').length}</span>)</button>
            <button class="btn btn-sm btn-outline" id="pill-ready" onclick="window.filterPipelineByPill('Ready for Pickup')">📦 Ready (<span id="count-ready">${orders.filter(o => o.status === 'Ready for Pickup').length}</span>)</button>
            <button class="btn btn-sm btn-outline" id="pill-completed" onclick="window.filterPipelineByPill('Completed')">✅ Completed (<span id="count-completed">${orders.filter(o => o.status === 'Completed').length}</span>)</button>
            <button class="btn btn-sm btn-outline" id="pill-rejected" onclick="window.filterPipelineByPill('Rejected')">❌ Rejected (<span id="count-rejected">${orders.filter(o => o.status === 'Rejected').length}</span>)</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table" id="orders-main-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Info</th>
                <th>Delivery Area & Address</th>
                <th>Files (${orders.reduce((acc, o) => acc + (o.files?.length || 1), 0)} Total PDFs)</th>
                <th style="background:rgba(59,130,246,0.1); color:var(--primary); font-weight:800; font-size:0.9rem;">📋 Specs & Copies</th>
                <th>Amount</th>
                <th>UTR Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orders.length === 0 ? `
                <tr>
                  <td colspan="9" class="text-center text-muted" style="padding:3.5rem;">
                    <div style="font-size:3rem; margin-bottom:0.5rem;">📄</div>
                    <h4>No Orders in Pipeline Yet</h4>
                    <p style="font-size:0.875rem; margin-top:0.25rem;">Orders submitted online by customers will automatically show up here live.</p>
                    <a href="#order" class="btn btn-sm btn-primary mt-3">+ Place Test Order</a>
                  </td>
                </tr>
              ` : orders.map(o => {
      const filesList = (o.files && o.files.length > 0) ? o.files : (o.file ? [o.file] : []);
      return `
                <tr id="order-row-${o.id}">
                  <td>
                    <b>${o.id}</b>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${formatDate(o.createdAt)}</div>
                  </td>
                  <td>
                    <b>${o.customerName || 'Customer'}</b><br>
                    <span style="font-size:0.825rem; color:var(--text-muted);">${o.customerPhone || 'N/A'}</span>
                  </td>
                  <td>
                    <div style="font-weight:700; font-size:0.825rem; color:var(--primary);">
                      ${(o.pricing?.deliveryFee && o.pricing.deliveryFee > 0)
          ? `🚚 ${o.pricing?.deliveryZone || 'Doorstep Delivery'} (+${formatCurrency(o.pricing.deliveryFee)})`
          : '🏪 Store Pickup (Free)'}
                    </div>
                    <div style="font-size:0.775rem; color:var(--text-muted); margin-top:0.25rem; max-width:200px;" title="${o.customerAddress || 'No address provided (Store Pickup)'}">
                      📍 ${o.customerAddress || 'Self Pickup at Shop'}
                    </div>
                  </td>
                  <td>
                    ${filesList.map((f, fIdx) => {
      const isExpired = f.uploadStatus === 'expired' || f.expired === true;
      const isUploaded = f.uploadStatus === 'uploaded' || (!isExpired && (f.downloadURL || f.url));
      const expiresAt = f.expiresAt ? new Date(f.expiresAt) : null;
      const daysLeft = expiresAt && !isExpired ? Math.ceil((expiresAt - Date.now()) / (1000 * 3600 * 24)) : null;

      let statusBadge = '';
      if (isExpired) {
        statusBadge = `<span style="background:rgba(239,68,68,0.12); color:#dc2626; font-size:0.68rem; font-weight:700; padding:0.12rem 0.4rem; border-radius:5px; border:1px solid rgba(239,68,68,0.3);">🔒 File Expired</span>`;
      } else if (isUploaded) {
        statusBadge = `<span style="background:rgba(16,185,129,0.14); color:#059669; font-size:0.68rem; font-weight:700; padding:0.12rem 0.4rem; border-radius:5px; border:1px solid rgba(16,185,129,0.3);">✓ File Uploaded</span>`;
      } else if (f.uploadStatus === 'failed') {
        statusBadge = `<span style="background:rgba(239,68,68,0.12); color:#dc2626; font-size:0.68rem; font-weight:700; padding:0.12rem 0.4rem; border-radius:5px;">✕ Upload Failed</span>`;
      } else {
        statusBadge = `<span style="background:rgba(59,130,246,0.12); color:#2563eb; font-size:0.68rem; font-weight:700; padding:0.12rem 0.4rem; border-radius:5px;">⏳ Uploading</span>`;
      }

      let expiryNote = '';
      if (daysLeft !== null && daysLeft > 0) {
        expiryNote = `<span style="font-size:0.68rem; color:var(--text-muted); margin-left:0.3rem;">(⏰ ${daysLeft}d left)</span>`;
      }

      const fileName = f.fileName || f.name || `Document_${fIdx + 1}.pdf`;
      const fileSize = f.fileSize || f.size || 'N/A';

      return `
                      <div style="margin-bottom:0.5rem; background:var(--bg-card); padding:0.5rem 0.65rem; border-radius:8px; border:1px solid var(--border-color);">
                        <div style="font-size:0.82rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; display:flex; align-items:center; gap:0.3rem;" title="${fileName}">
                          📄 ${fileName} <span style="font-size:0.7rem; color:var(--text-muted);">(${f.pages || 1} pgs)</span>
                        </div>
                        <div style="margin-top:0.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.25rem;">
                          ${statusBadge} ${expiryNote}
                        </div>
                        ${isExpired
                          ? `<div style="font-size:0.72rem; color:#dc2626; margin-top:0.3rem; font-weight:600;">🔒 Original file deleted from cloud after 7 days (privacy protected)</div>`
                          : `<div style="display:flex; gap:0.3rem; margin-top:0.35rem; flex-wrap:wrap;">
                               <button class="btn btn-sm btn-outline" style="font-size:0.7rem; padding:0.15rem 0.45rem;" onclick="window.previewOrderFile('${o.id}', ${fIdx})">👁️ Preview</button>
                               <button class="btn btn-sm btn-primary" style="font-size:0.7rem; padding:0.15rem 0.45rem;" onclick="window.downloadOrderFile('${o.id}', ${fIdx})">📥 Download</button>
                               <button class="btn btn-sm btn-success" style="font-size:0.7rem; padding:0.15rem 0.45rem;" onclick="window.printOrderFile('${o.id}', ${fIdx})">🖨️ Print</button>
                             </div>`
                        }
                      </div>
                    `; }).join('')}
                  </td>
                  <td style="min-width:230px;">
                    ${filesList.map((f, fIdx) => {
            const opts = f.options || o.options || {};
            const paperSize = opts.paperSize || 'A4';
            const paperQuality = opts.paperQuality || '70 GSM';
            const copies = opts.copies || 1;
            const colorMode = opts.colorMode || 'B&W';
            const binding = opts.binding && opts.binding !== 'None' ? opts.binding : null;
            const lamination = opts.lamination && opts.lamination !== 'No' ? opts.lamination : null;

            let colorBadge = '';
            if (colorMode === 'Custom Split') {
              colorBadge = `<span style="background:rgba(16,185,129,0.18); color:#059669; font-weight:700; font-size:0.78rem; padding:0.18rem 0.5rem; border-radius:6px; border:1px solid rgba(16,185,129,0.35);">🎨 Color Pgs: ${opts.colorPageRange || 'Selected'}</span>`;
            } else if (colorMode === 'Color') {
              colorBadge = `<span style="background:rgba(16,185,129,0.18); color:#059669; font-weight:700; font-size:0.78rem; padding:0.18rem 0.5rem; border-radius:6px; border:1px solid rgba(16,185,129,0.35);">🎨 Full Color</span>`;
            } else {
              colorBadge = `<span style="background:var(--bg-body); color:var(--text-main); font-weight:700; font-size:0.78rem; padding:0.18rem 0.5rem; border-radius:6px; border:1px solid var(--border-color);">⬛ B&W</span>`;
            }

            const rangeBadge = opts.pageRange && opts.pageRange !== 'All'
              ? `<span style="background:rgba(59,130,246,0.15); color:#2563eb; font-weight:700; font-size:0.78rem; padding:0.18rem 0.5rem; border-radius:6px;">📄 Pgs: ${opts.pageRange}</span>`
              : '';

            return `
                      <div style="margin-bottom:0.5rem; background:rgba(59,130,246,0.06); border:1.5px solid rgba(59,130,246,0.22); padding:0.65rem 0.75rem; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.03);">
                        <div style="font-size:0.9rem; font-weight:800; color:var(--text-main); display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                          <span>${filesList.length > 1 ? `Doc ${fIdx + 1}: ` : ''}📋 ${paperSize} <span style="font-weight:600; font-size:0.8rem; color:var(--text-muted);">(${paperQuality})</span></span>
                          <span style="background:var(--primary); color:#ffffff; font-weight:900; font-size:0.82rem; padding:0.2rem 0.6rem; border-radius:12px; white-space:nowrap; box-shadow:0 2px 4px rgba(59,130,246,0.25);">
                            ⚡ ${copies} ${copies > 1 ? 'Copies' : 'Copy'}
                          </span>
                        </div>

                        <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center; margin-top:0.35rem;">
                          ${colorBadge}
                          ${rangeBadge}
                          ${binding ? `<span style="background:rgba(139,92,246,0.15); color:#6d28d9; font-weight:700; font-size:0.78rem; padding:0.18rem 0.5rem; border-radius:6px;">📘 ${binding} Binding</span>` : ''}
                          ${lamination ? `<span style="background:rgba(245,158,11,0.18); color:#b45309; font-weight:700; font-size:0.78rem; padding:0.18rem 0.5rem; border-radius:6px;">✨ ${lamination} Lamination</span>` : ''}
                        </div>
                      </div>
                      `;
          }).join('')}
                  </td>
                  <td><b>${formatCurrency(o.pricing?.total)}</b></td>
                  <td>
                    <code>${o.payment?.utr || 'N/A'}</code><br>
                    <button class="btn btn-sm btn-outline" style="font-size:0.7rem; padding:0.2rem 0.5rem; margin-top:0.35rem;" onclick="window.viewOrderScreenshot('${o.id}')">🖼️ View Screenshot</button>
                  </td>
                  <td>
                    ${(() => {
          const isLocked = o.isStatusLocked || o.status === 'Completed' || o.status === 'Rejected';
          const isComp = o.status === 'Completed';
          if (isLocked) {
            return `
                        <div id="status-cell-container-${o.id}" style="display:flex; flex-direction:column; gap:0.25rem;">
                          <span style="background:${isComp ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)'}; color:${isComp ? '#059669' : '#dc2626'}; font-weight:800; font-size:0.8rem; padding:0.35rem 0.6rem; border-radius:8px; border:1.5px solid ${isComp ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.35)'}; white-space:nowrap; display:inline-flex; align-items:center; gap:0.3rem;">
                            🔒 ${isComp ? '✅ Completed (Confirmed)' : '❌ Rejected (Confirmed)'}
                          </span>
                          <button class="btn btn-sm btn-link" style="font-size:0.7rem; color:var(--text-muted); padding:0; text-decoration:underline; text-align:left; border:none; background:none; cursor:pointer;" onclick="window.unlockOrderStatus('${o.id}')" title="Unlock status if edit is required">
                            🔓 Unlock Status
                          </button>
                        </div>
                        `;
          }
          return `
                      <div id="status-cell-container-${o.id}">
                        <select class="form-select" style="font-size:0.8rem; padding:0.35rem 0.5rem; font-weight:600;" onchange="window.updateOrderStatusFromTable('${o.id}', this.value)" id="select-status-${o.id}">
                          <option value="Waiting Verification" ${o.status === 'Waiting Verification' ? 'selected' : ''}>⏳ Waiting Verification</option>
                          <option value="Payment Approved" ${o.status === 'Payment Approved' ? 'selected' : ''}>💳 Payment Approved</option>
                          <option value="Printing" ${o.status === 'Printing' ? 'selected' : ''}>🖨️ Printing</option>
                          <option value="Ready for Pickup" ${o.status === 'Ready for Pickup' ? 'selected' : ''}>📦 Ready for Pickup</option>
                          <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>✅ Completed (Confirm & Lock)</option>
                          <option value="Rejected" ${o.status === 'Rejected' ? 'selected' : ''}>❌ Rejected (Confirm & Lock)</option>
                        </select>
                      </div>
                      `;
        })()}
                  </td>
                  <td>
                    <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
                      <a href="#admin-orders?invoice=${o.id}" class="btn btn-sm btn-secondary" title="View Printing Invoice">🧾 Invoice</a>
                      <button class="btn btn-sm btn-success" onclick="window.sendWhatsAppInvoice('${o.id}')" title="Send Invoice via WhatsApp">💬 WhatsApp</button>
                      <button class="btn btn-sm btn-primary" onclick="window.openAWBDispatch('${o.id}')" title="Upload/scan AWB and send shipment notification">📦 Dispatch</button>
                      <button class="btn btn-sm btn-danger" onclick="window.deleteOrderRecord('${o.id}')" title="Delete Order Record">🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
                `;
    }).join('')}
              <tr id="order-no-match-row" style="display:none;">
                <td colspan="9" class="text-center text-muted" style="padding:2.5rem;">
                  <div style="font-size:2rem; margin-bottom:0.35rem;">🔍</div>
                  <h4>No orders match your search filter</h4>
                  <p style="font-size:0.85rem; margin-top:0.25rem;">Try clearing the search box or changing the status filter dropdown.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.renderAdminLayout('orders', html);

    // Live Order Reception Polling Timer (Every 6 seconds — new orders only)
    if (window._adminOrderSyncTimer) {
      clearInterval(window._adminOrderSyncTimer);
    }
    if (!window._deletedOrderIds) window._deletedOrderIds = new Set();
    window._knownOrderIds = new Set(orders.map(o => o.id));

    window._adminOrderSyncTimer = setInterval(async () => {
      if (!window.location.hash.startsWith('#admin-orders')) {
        clearInterval(window._adminOrderSyncTimer);
        window._adminOrderSyncTimer = null;
        return;
      }
      try {
        const freshOrders = await DBService.getOrders();
        // Only re-render if there is a genuinely NEW order id (not a deletion)
        const genuinelyNew = freshOrders.filter(o =>
          !window._knownOrderIds.has(o.id) && !window._deletedOrderIds.has(o.id)
        );
        if (genuinelyNew.length > 0) {
          window._knownOrderIds = new Set(freshOrders.map(o => o.id));
          NotificationService.showToast(`🔔 NEW ORDER: ${genuinelyNew[0].id} (${genuinelyNew[0].customerName})!`, 'success');
          this.renderOrders(queryStr);
        }
      } catch (e) {}
    }, 6000);

    // Global Order Action Helpers
    window.deleteOrderRecord = (orderId) => {
      if (!confirm(`Delete order "${orderId}"? This cannot be undone.`)) return;

      // Guard: tell the polling timer this ID was deleted so it never re-adds it
      if (!window._deletedOrderIds) window._deletedOrderIds = new Set();
      window._deletedOrderIds.add(orderId);
      if (window._knownOrderIds) window._knownOrderIds.delete(orderId);

      // Instant UI: animate row out
      const row = document.getElementById(`order-row-${orderId}`);
      if (row) {
        row.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(40px)';
        setTimeout(() => { try { row.remove(); } catch(e){} }, 280);
      }

      // Background: delete from localStorage + cloud
      DBService.deleteOrder(orderId);
      NotificationService.showToast(`🗑️ Order ${orderId} deleted!`, 'info');

      // Update count badges
      ['pipeline-total-count', 'count-all'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = Math.max(0, parseInt(el.textContent || '0') - 1);
      });
    };
    window.downloadOrderFile = async (orderId, fileIndex) => {
      const order = await DBService.getOrderById(orderId);
      if (!order || !order.files || !order.files[fileIndex]) {
        NotificationService.showToast('File record not found.', 'error');
        return;
      }
      const file = order.files[fileIndex];
      if (file.uploadStatus === 'expired' || file.expired) {
        NotificationService.showToast('File has expired and was deleted from cloud storage after 7 days.', 'warning');
        return;
      }

      const url = file.downloadURL || file.url || await StorageService.getFileUrl(file);

      if (!url) {
        NotificationService.showToast('File download URL unavailable.', 'error');
        return;
      }

      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName || file.name || `Document_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      NotificationService.showToast(`Downloading original file: ${file.fileName || file.name}...`, 'success');
    };

    window.printOrderFile = async (orderId, fileIndex) => {
      const order = await DBService.getOrderById(orderId);
      if (!order || !order.files || !order.files[fileIndex]) {
        NotificationService.showToast('File record not found.', 'error');
        return;
      }
      const file = order.files[fileIndex];
      if (file.uploadStatus === 'expired' || file.expired) {
        NotificationService.showToast('File has expired and was deleted from cloud storage.', 'warning');
        return;
      }

      const url = file.downloadURL || file.url || await StorageService.getFileUrl(file);
      if (!url) {
        NotificationService.showToast('File print URL unavailable.', 'error');
        return;
      }

      const printWin = window.open(url, '_blank');
      if (printWin) {
        NotificationService.showToast(`Opening document for native printing...`, 'info');
      } else {
        window.location.href = url;
      }
    };

    window.previewOrderFile = async (orderId, fileIndex) => {
      const order = await DBService.getOrderById(orderId);
      if (!order || !order.files || !order.files[fileIndex]) {
        NotificationService.showToast('File record not found.', 'error');
        return;
      }
      const file = order.files[fileIndex];
      const fileName = file.fileName || file.name || 'Document.pdf';
      const fileSize = file.fileSize || file.size || 'N/A';
      const fileType = file.fileType || file.type || '';
      const isExpired = file.uploadStatus === 'expired' || file.expired === true;

      if (isExpired) {
        (ModalComponent || window.ModalComponent).show({
          title: `🔒 File Expired - ${fileName}`,
          bodyHTML: `
            <div style="text-align:center; padding:2.5rem 1.5rem; background:rgba(239,68,68,0.06); border-radius:14px; border:2px dashed #ef4444;">
              <div style="font-size:3.5rem; margin-bottom:0.5rem;">🔒</div>
              <h3 style="font-size:1.3rem; color:#dc2626; font-weight:800;">Original File Expired & Deleted</h3>
              <p style="color:var(--text-muted); font-size:0.875rem; margin-top:0.5rem; max-width:500px; margin-left:auto; margin-right:auto;">
                The original file <b>${fileName}</b> (${fileSize}) was automatically deleted from cloud storage 7 days after upload to protect customer data privacy.
              </p>
              <div style="margin-top:1rem; font-size:0.8rem; color:var(--text-muted);">
                Order history and print specifications remain preserved in Firestore.
              </div>
            </div>
          `,
          width: '600px'
        });
        return;
      }

      const viewUrl = file.downloadURL || file.url || await StorageService.getFileUrl(file);

      const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileType.includes('word');
      const isImage = fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);

      let previewHTML = '';

      if (isDocx) {
        previewHTML = `
          <div style="text-align:center; padding:3rem 2rem; background:var(--bg-card); border-radius:14px; border:1px solid var(--border-color);">
            <div style="font-size:4rem; margin-bottom:0.75rem;">📝</div>
            <h3 style="font-size:1.35rem; font-weight:800; color:var(--text-main);">${fileName}</h3>
            <p style="color:var(--text-muted); font-size:0.875rem; margin-top:0.35rem;">
              Microsoft Word Document • ${fileSize} • ~${file.pages || 1} pages
            </p>
            <div style="margin-top:1.5rem; background:var(--bg-body); padding:1rem; border-radius:10px; border:1px solid var(--border-color); font-size:0.85rem; color:var(--text-muted); max-width:520px; margin-left:auto; margin-right:auto;">
              ℹ️ DOCX files cannot be rendered natively inside browser iframes. Click <b>Download DOCX</b> below to view or print in Microsoft Word.
            </div>
          </div>
        `;
      } else if (isImage) {
        previewHTML = `
          <div style="text-align:center; padding:0.5rem; background:var(--bg-card); border-radius:8px;">
            <img src="${viewUrl}" alt="${fileName}" style="max-width:100%; max-height:68vh; border-radius:8px; border:1px solid var(--border-color); box-shadow:var(--shadow-md); object-fit:contain;" />
          </div>
        `;
      } else {
        // PDF or General Document
        previewHTML = `
          <div style="width:100%; height:70vh; background:var(--bg-card); border-radius:8px; overflow:hidden; border:1px solid var(--border-color);">
            <iframe src="${viewUrl}" style="width:100%; height:100%; border:none;"></iframe>
          </div>
        `;
      }

      const modal = ModalComponent || window.ModalComponent;
      if (modal) {
        modal.show({
          title: `Document Preview - ${fileName}`,
          bodyHTML: previewHTML,
          footerHTML: `
            ${viewUrl ? `<button class="btn btn-primary" onclick="window.downloadOrderFile('${orderId}', ${fileIndex})">📥 Download Original File</button>` : ''}
            ${viewUrl ? `<button class="btn btn-success" onclick="window.printOrderFile('${orderId}', ${fileIndex})">🖨️ Print Document</button>` : ''}
            ${viewUrl ? `<button class="btn btn-outline" onclick="window.openFullScreenFile('${orderId}', ${fileIndex})">🔗 Open in New Tab ↗</button>` : ''}
            <button class="btn btn-secondary" onclick="if(window.ModalComponent) window.ModalComponent.close(); else document.getElementById('active-modal-overlay')?.remove();">Close</button>
          `,
          width: '900px'
        });
      }
    };


    window.openFullScreenFile = async (orderId, fileIndex) => {
      const order = await DBService.getOrderById(orderId);
      if (!order || !order.files || !order.files[fileIndex]) {
        NotificationService.showToast('File not found', 'error');
        return;
      }
      const file = order.files[fileIndex];
      const url = await StorageService.getFileUrl(file);
      if (!url) {
        NotificationService.showToast('File URL unavailable', 'error');
        return;
      }

      const newWin = window.open(url, '_blank');
      if (!newWin) {
        window.location.href = url;
      }
    };

    window.viewOrderScreenshot = async (orderId) => {
      const order = await DBService.getOrderById(orderId);
      if (!order) {
        NotificationService.showToast('Order not found', 'error');
        return;
      }

      const pay = order.payment || {};
      const possibleUrl = pay.screenshotUrl || pay.screenshotDataUrl || pay.screenshot || order.screenshotUrl || '';
      const possibleDataUrl = pay.screenshotDataUrl || pay.fallbackData || (possibleUrl.startsWith('data:') ? possibleUrl : '');
      const possibleIdbKey = pay.screenshotIdbKey || (possibleUrl.startsWith('idb://') ? possibleUrl.replace('idb://', '') : '');

      const hasRealScreenshot = (possibleUrl.startsWith('http://') || possibleUrl.startsWith('https://') || possibleUrl.startsWith('data:image') || possibleDataUrl.startsWith('data:image'));
      
      let screenshotUrl = '';
      if (hasRealScreenshot) {
        screenshotUrl = await StorageService.getFileUrl({ 
          url: possibleUrl, 
          dataUrl: possibleDataUrl, 
          idbKey: possibleIdbKey 
        });
      }

      let bodyHTML = '';

      if (screenshotUrl && screenshotUrl.trim() !== '') {
        bodyHTML = `
          <div style="text-align:center; padding:0.5rem;">
            <div style="background:var(--bg-card); padding:0.75rem 1rem; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
              <div>UTR / Ref: <b style="color:var(--primary); font-family:monospace; font-size:1rem;">${pay.utr || 'N/A'}</b></div>
              <div>Payer Name: <b>${pay.payerName || order.customerName}</b></div>
            </div>
            
            <div style="position:relative; display:inline-block; max-width:100%;">
              <img src="${screenshotUrl}" alt="Payment Screenshot" style="max-width:100%; max-height:65vh; border-radius:12px; border:1px solid var(--border-color); box-shadow:var(--shadow-md); display:inline-block; object-fit:contain;" 
                onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'text-center text-muted\\' style=\\'padding:2rem;\\'>⚠️ Screenshot preview unavailable on this device.<br><a href=\\'${screenshotUrl}\\' target=\\'_blank\\' class=\\'btn btn-sm btn-primary mt-2\\'>Open Screenshot Link ↗</a></div>';" />
            </div>

            <div style="margin-top:1rem; display:flex; gap:0.75rem; justify-content:center;">
              <a href="${screenshotUrl}" target="_blank" download="Payment_Receipt_${orderId}.png" class="btn btn-sm btn-primary">
                📥 Download Screenshot
              </a>
              <a href="${screenshotUrl}" target="_blank" class="btn btn-sm btn-outline">
                🔗 Open in New Tab ↗
              </a>
            </div>
          </div>
        `;
      } else {
        bodyHTML = `
          <div style="background:linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:white; padding:2rem; border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:1rem; margin-bottom:1.5rem;">
              <div>
                <div style="color:#10b981; font-weight:700; font-size:0.85rem; text-transform:uppercase;">✓ UPI Payment Details Submitted</div>
                <h3 style="font-size:1.4rem; margin-top:0.2rem;">${DBService.getSettingsSync().shopName || 'Print Shop'}</h3>
              </div>
              <div style="font-size:2.5rem;">📱</div>
            </div>

            <div style="margin-bottom:1.5rem;">
              <div style="font-size:0.8rem; color:#94a3b8; text-transform:uppercase;">Total Amount Payable</div>
              <div style="font-size:2.25rem; font-weight:800; color:#38bdf8;">${formatCurrency(order.pricing?.total)}</div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; background:rgba(255,255,255,0.05); padding:1rem; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
              <div>
                <div style="font-size:0.75rem; color:#94a3b8;">12-DIGIT UTR / REF NO.</div>
                <div style="font-size:1.1rem; font-weight:700; font-family:monospace; color:#f1f5f9;">${pay.utr || 'N/A'}</div>
              </div>
              <div>
                <div style="font-size:0.75rem; color:#94a3b8;">PAYER NAME</div>
                <div style="font-size:1.05rem; font-weight:700; color:#f1f5f9;">${pay.payerName || order.customerName}</div>
              </div>
            </div>

            <div style="margin-top:1.25rem; font-size:0.82rem; color:#94a3b8; text-align:center; background:rgba(255,255,255,0.04); padding:0.75rem; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
              ℹ️ Customer submitted payment with UTR Ref <b>${pay.utr || 'N/A'}</b> & Payer Name <b>${pay.payerName || order.customerName}</b> without attaching an optional screenshot image.
            </div>
          </div>
        `;
      }

      const modal = ModalComponent || window.ModalComponent;
      if (modal) {
        modal.show({
          title: `Payment Receipt Inspection - ${order.id}`,
          bodyHTML: bodyHTML,
          footerHTML: `<button class="btn btn-secondary" onclick="if(window.ModalComponent) window.ModalComponent.close(); else document.getElementById('active-modal-overlay')?.remove();">Close</button>`,
          width: '650px'
        });
      } else {
        NotificationService.showToast(`UTR: ${pay.utr} | Payer: ${pay.payerName}`, 'info');
      }
    };

    const updatePipelineCounts = () => {
      const getC = (st) => st ? orders.filter(o => o.status === st).length : orders.length;
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      setTxt('pipeline-total-count', orders.length);
      setTxt('count-all', getC(''));
      setTxt('count-waiting', getC('Waiting Verification'));
      setTxt('count-approved', getC('Payment Approved'));
      setTxt('count-printing', getC('Printing'));
      setTxt('count-ready', getC('Ready for Pickup'));
      setTxt('count-completed', getC('Completed'));
      setTxt('count-rejected', getC('Rejected'));
    };

    window.filterPipelineByPill = (st) => {
      if (statusFilter) {
        statusFilter.value = st;
      }
      const pills = document.querySelectorAll('#pipeline-status-pills .btn');
      pills.forEach(p => {
        p.classList.remove('btn-primary', 'active-pill');
        p.classList.add('btn-outline');
      });

      const mapPillId = {
        '': 'pill-all',
        'Waiting Verification': 'pill-waiting',
        'Payment Approved': 'pill-approved',
        'Printing': 'pill-printing',
        'Ready for Pickup': 'pill-ready',
        'Completed': 'pill-completed',
        'Rejected': 'pill-rejected'
      };
      const activeBtn = document.getElementById(mapPillId[st] || 'pill-all');
      if (activeBtn) {
        activeBtn.classList.remove('btn-outline');
        activeBtn.classList.add('btn-primary', 'active-pill');
      }
      applyFilters();
    };

    window.updateOrderStatusFromTable = async (orderId, newStatus) => {
      const targetOrder = orders.find(o => o.id === orderId);
      const isFinalStatus = newStatus === 'Completed' || newStatus === 'Rejected';

      if (isFinalStatus) {
        const actionLabel = newStatus === 'Completed' ? 'COMPLETED' : 'REJECTED';
        if (!confirm(`🔒 Confirm marking Order "${orderId}" as ${actionLabel}?\n\nOnce confirmed, this status will be locked and cannot be accidentally changed.`)) {
          // Reset select box back to previous status
          const selectEl = document.getElementById(`select-status-${orderId}`);
          if (selectEl && targetOrder) selectEl.value = targetOrder.status;
          return;
        }
      }

      await DBService.updateOrderStatus(orderId, newStatus, isFinalStatus ? true : false);
      if (targetOrder) {
        targetOrder.status = newStatus;
        targetOrder.isStatusLocked = isFinalStatus;
      }

      // Flash row highlight animation
      const row = document.getElementById(`order-row-${orderId}`);
      if (row) {
        row.style.transition = 'background-color 0.4s ease';
        row.style.backgroundColor = newStatus === 'Completed' ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.2)';
        setTimeout(() => { if (row) row.style.backgroundColor = ''; }, 1400);
      }

      // Replace status cell with locked badge if finalized
      const cellContainer = document.getElementById(`status-cell-container-${orderId}`);
      if (cellContainer && cellContainer.parentNode && isFinalStatus) {
        const isComp = newStatus === 'Completed';
        cellContainer.parentNode.innerHTML = `
          <div id="status-cell-container-${orderId}" style="display:flex; flex-direction:column; gap:0.25rem;">
            <span style="background:${isComp ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)'}; color:${isComp ? '#059669' : '#dc2626'}; font-weight:800; font-size:0.8rem; padding:0.35rem 0.6rem; border-radius:8px; border:1.5px solid ${isComp ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.35)'}; white-space:nowrap; display:inline-flex; align-items:center; gap:0.3rem;">
              🔒 ${isComp ? '✅ Completed (Confirmed)' : '❌ Rejected (Confirmed)'}
            </span>
            <button class="btn btn-sm btn-link" style="font-size:0.7rem; color:var(--text-muted); padding:0; text-decoration:underline; text-align:left; border:none; background:none; cursor:pointer;" onclick="window.unlockOrderStatus('${orderId}')" title="Unlock status if edit is required">
              🔓 Unlock Status
            </button>
          </div>
        `;
      }

      if (newStatus === 'Completed') {
        NotificationService.showToast(`🔒 Order ${orderId} CONFIRMED & COMPLETED! Status locked.`, 'success');
      } else {
        NotificationService.showToast(`Order ${orderId} updated to '${newStatus}'`, 'info');
      }

      updatePipelineCounts();
      applyFilters();
    };

    window.unlockOrderStatus = async (orderId) => {
      if (confirm(`🔓 Are you sure you want to UNLOCK the status for Order "${orderId}"? This will allow changing the status again.`)) {
        const targetOrder = orders.find(o => o.id === orderId);
        if (targetOrder) {
          targetOrder.isStatusLocked = false;
          await DBService.updateOrderStatus(orderId, targetOrder.status, false);

          const cellContainer = document.getElementById(`status-cell-container-${orderId}`);
          if (cellContainer && cellContainer.parentNode) {
            cellContainer.parentNode.innerHTML = `
              <div id="status-cell-container-${orderId}">
                <select class="form-select" style="font-size:0.8rem; padding:0.35rem 0.5rem; font-weight:600;" onchange="window.updateOrderStatusFromTable('${orderId}', this.value)" id="select-status-${orderId}">
                  <option value="Waiting Verification" ${targetOrder.status === 'Waiting Verification' ? 'selected' : ''}>⏳ Waiting Verification</option>
                  <option value="Payment Approved" ${targetOrder.status === 'Payment Approved' ? 'selected' : ''}>💳 Payment Approved</option>
                  <option value="Printing" ${targetOrder.status === 'Printing' ? 'selected' : ''}>🖨️ Printing</option>
                  <option value="Ready for Pickup" ${targetOrder.status === 'Ready for Pickup' ? 'selected' : ''}>📦 Ready for Pickup</option>
                  <option value="Completed" ${targetOrder.status === 'Completed' ? 'selected' : ''}>✅ Completed (Confirm & Lock)</option>
                  <option value="Rejected" ${targetOrder.status === 'Rejected' ? 'selected' : ''}>❌ Rejected (Confirm & Lock)</option>
                </select>
              </div>
            `;
          }
          NotificationService.showToast(`🔓 Status unlocked for Order ${orderId}`, 'info');
        }
      }
    };

    // ── AWB DISPATCH / OCR / WHATSAPP ─────────────────────────────────────
    window.openAWBDispatch = async (orderId) => {
      const order = await DBService.getOrderById(orderId);
      if (!order) {
        NotificationService.showToast('Order not found.', 'error');
        return;
      }

      const courier = order.courier || {};
      const existingSlip = courier.awbSlipUrl || '';
      const existingAwb = courier.awbNumber || '';

      const modal = document.createElement('div');
      modal.id = 'awb-dispatch-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';
      modal.innerHTML = `
        <div style="width:min(720px,100%);max-height:92vh;overflow:auto;background:var(--bg-card,#fff);border-radius:18px;border:1px solid var(--border-color,#e2e8f0);box-shadow:0 24px 80px rgba(0,0,0,.25);">
          <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border-color,#e2e8f0);display:flex;justify-content:space-between;align-items:center;gap:1rem;">
            <div>
              <h3 style="margin:0;">📦 Dispatch Order</h3>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:.2rem;">Order ${order.id} • ${order.customerName || 'Customer'}</div>
            </div>
            <button id="awb-close" class="btn btn-sm btn-outline">✕</button>
          </div>

          <div style="padding:1.25rem;display:grid;gap:1rem;">
            <div class="glass-panel" style="padding:1rem;border-radius:12px;">
              <div style="font-weight:800;margin-bottom:.65rem;">Courier</div>
              <select id="awb-courier" class="form-select">
                <option value="ST Courier" selected>ST Courier</option>
              </select>
            </div>

            <div class="glass-panel" style="padding:1rem;border-radius:12px;">
              <div style="font-weight:800;margin-bottom:.65rem;">📷 AWB Slip</div>
              <input id="awb-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" class="form-control">
              <div id="awb-preview" style="margin-top:.75rem;display:${existingSlip ? 'block' : 'none'};">
                ${existingSlip ? `<a href="${existingSlip}" target="_blank" rel="noopener" class="btn btn-sm btn-outline">👁️ View Existing AWB Slip</a>` : ''}
              </div>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:.45rem;">JPG/PNG/WEBP/PDF • max 15 MB</div>
            </div>

            <div class="glass-panel" style="padding:1rem;border-radius:12px;">
              <div style="font-weight:800;margin-bottom:.65rem;">🔍 AWB Number</div>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                <input id="awb-number" class="form-control" value="${existingAwb}" placeholder="Scan/upload slip to detect AWB" style="flex:1;min-width:220px;">
                <button id="awb-ocr" class="btn btn-secondary" type="button">🔍 Read AWB</button>
              </div>
              <div id="awb-confidence" style="font-size:.75rem;color:var(--text-muted);margin-top:.45rem;">Admin must verify the detected number before sending.</div>
            </div>

            <div class="glass-panel" style="padding:1rem;border-radius:12px;">
              <div style="font-weight:800;margin-bottom:.65rem;">🧾 Customer Invoice</div>
              <a href="#admin-orders?invoice=${encodeURIComponent(order.id)}" class="btn btn-sm btn-outline">👁️ Preview Invoice</a>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:.45rem;">The customer message includes the secure order/invoice tracking page.</div>
            </div>

            <div class="glass-panel" style="padding:1rem;border-radius:12px;">
              <div style="font-weight:800;margin-bottom:.65rem;">🔗 Tracking</div>
              <div style="font-size:.82rem;">Official ST Courier tracking page</div>
              <a href="https://www.stcourier.com/track/shipment" target="_blank" rel="noopener" style="font-size:.8rem;">https://www.stcourier.com/track/shipment</a>
            </div>

            <div id="awb-progress" style="display:none;padding:.8rem 1rem;border-radius:10px;background:rgba(59,130,246,.08);font-weight:700;"></div>

            <div style="display:flex;justify-content:flex-end;gap:.5rem;flex-wrap:wrap;">
              <button id="awb-save" class="btn btn-secondary">💾 Save Dispatch</button>
              <button id="awb-send" class="btn btn-success">💬 Save & Open WhatsApp</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => modal.remove();
      document.getElementById('awb-close').onclick = close;
      modal.addEventListener('click', e => { if (e.target === modal) close(); });

      let selectedFile = null;
      let uploaded = existingSlip ? {
        url: courier.awbSlipUrl,
        storagePath: courier.awbSlipStoragePath || '',
        fileName: courier.awbSlipFileName || '',
        mimeType: courier.awbSlipMimeType || ''
      } : null;

      const fileInput = document.getElementById('awb-file');
      const numberInput = document.getElementById('awb-number');
      const confidenceEl = document.getElementById('awb-confidence');
      const progress = document.getElementById('awb-progress');

      fileInput.onchange = async () => {
        selectedFile = fileInput.files?.[0] || null;
        if (!selectedFile) return;
        confidenceEl.textContent = `Selected ${selectedFile.name}. Click "Read AWB" to run OCR.`;
      };

      document.getElementById('awb-ocr').onclick = async () => {
        if (!selectedFile) {
          NotificationService.showToast('Upload or scan the AWB slip first.', 'warning');
          return;
        }
        const btn = document.getElementById('awb-ocr');
        btn.disabled = true;
        btn.textContent = '⏳ Reading...';
        progress.style.display = 'block';
        progress.textContent = '🔍 Reading AWB slip...';
        try {
          const mod = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
          const { createWorker } = mod;
          const worker = await createWorker('eng');
          const result = await worker.recognize(selectedFile);
          const text = result?.data?.text || '';
          await worker.terminate();

          const candidates = [];
          const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
          for (const line of lines) {
            if (/(awb|airway|tracking|consignment|shipment)/i.test(line)) {
              const nums = line.match(/[A-Z0-9][A-Z0-9\-]{7,24}/gi) || [];
              nums.forEach(v => candidates.push(v.replace(/[^A-Z0-9]/gi, '')));
            }
          }
          const all = text.match(/[A-Z0-9][A-Z0-9\-]{8,24}/gi) || [];
          candidates.push(...all.map(v => v.replace(/[^A-Z0-9]/gi, '')));
          const unique = [...new Set(candidates)].filter(v => /\d/.test(v));
          if (!unique.length) throw new Error('Could not confidently detect an AWB number. Enter it manually.');
          numberInput.value = unique[0];
          confidenceEl.textContent = `⚠️ OCR suggestion: ${unique[0]}. Verify the number before sending.`;
          progress.textContent = '✅ AWB candidate detected. Please verify it.';
        } catch (e) {
          confidenceEl.textContent = '⚠️ OCR could not confidently detect the AWB. Enter it manually.';
          progress.textContent = `⚠️ ${e.message || 'OCR failed'}`;
          NotificationService.showToast(e.message || 'OCR failed. Enter AWB manually.', 'warning');
        } finally {
          btn.disabled = false;
          btn.textContent = '🔍 Read AWB';
        }
      };

      const uploadIfNeeded = async () => {
        if (!selectedFile) return uploaded;
        progress.style.display = 'block';
        progress.textContent = '📤 Uploading AWB slip...';
        uploaded = await AWBDispatchService.uploadAWBSlip(selectedFile, order.id);
        return uploaded;
      };

      const getCourierData = async () => {
        const awb = numberInput.value.trim();
        if (!awb) throw new Error('AWB number is required.');
        if (!uploaded?.url) await uploadIfNeeded();
        if (!uploaded?.url) throw new Error('AWB slip is required.');
        return {
          courierName: document.getElementById('awb-courier').value,
          awbNumber: awb,
          awbSlipUrl: uploaded.url,
          awbSlipStoragePath: uploaded.storagePath || '',
          awbSlipFileName: uploaded.fileName || '',
          awbSlipMimeType: uploaded.mimeType || selectedFile?.type || '',
          dispatchDate: new Date().toISOString(),
          awbVerified: true,
          awbOcrConfidence: null,
          whatsappSent: false,
          whatsappSentAt: null,
          whatsappMessageId: null,
          whatsappError: null
        };
      };

      document.getElementById('awb-save').onclick = async () => {
        const btn = document.getElementById('awb-save');
        btn.disabled = true;
        try {
          progress.style.display = 'block';
          progress.textContent = '💾 Saving dispatch...';
          const data = await getCourierData();
          await DBService.updateOrderCourier(order.id, data);
          NotificationService.showToast(`✅ AWB ${data.awbNumber} saved for ${order.id}.`, 'success');
          close();
        } catch (e) {
          progress.textContent = `❌ ${e.message || 'Save failed'}`;
          NotificationService.showToast(e.message || 'Dispatch save failed.', 'error');
        } finally {
          btn.disabled = false;
        }
      };

      document.getElementById('awb-send').onclick = async () => {
        const btn = document.getElementById('awb-send');
        if (btn.dataset.busy === '1') return;
        if (courier.whatsappPrepared) {
          if (!confirm('WhatsApp was already sent for this dispatch. Send again?')) return;
        }
        btn.dataset.busy = '1';
        btn.disabled = true;
        try {
          const data = await getCourierData();
          progress.style.display = 'block';
          progress.textContent = '💾 Saving dispatch...';
          await DBService.updateOrderCourier(order.id, data);

          progress.textContent = '💬 Preparing WhatsApp message...';
          const invoiceUrl = `${window.location.origin}${window.location.pathname}#track?id=${encodeURIComponent(order.id)}`;
          const whatsappUrl = AWBDispatchService.buildWhatsAppLink({
            customerPhone: order.customerPhone,
            customerName: order.customerName || 'Customer',
            orderId: order.id,
            courierName: data.courierName,
            awbNumber: data.awbNumber,
            invoiceUrl,
            trackingUrl: 'https://www.stcourier.com/track/shipment'
          });

          const sentAt = new Date().toISOString();
          await DBService.updateOrderCourier(order.id, {
            ...data,
            whatsappPrepared: true,
            whatsappPreparedAt: sentAt,
            whatsappError: null
          });
          await DBService.updateOrderStatus(order.id, 'Dispatched', false);

          // No WhatsApp API/key: open official WhatsApp click-to-chat with the
          // complete message pre-filled. The admin presses Send in WhatsApp.
          window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

          progress.textContent = '✅ WhatsApp message prepared. Press Send in WhatsApp.';
          NotificationService.showToast(`✅ Order ${order.id} marked dispatched. WhatsApp is ready to send.`, 'success');
          setTimeout(close, 900);
        } catch (e) {
          console.error('[AWB DISPATCH]', e);
          try {
            await DBService.updateOrderCourier(order.id, {
              whatsappSent: false,
              whatsappError: e.message || 'WhatsApp send failed'
            });
          } catch (_) {}
          progress.textContent = `❌ ${e.message || 'WhatsApp send failed'}`;
          NotificationService.showToast(e.message || 'WhatsApp send failed.', 'error');
        } finally {
          btn.dataset.busy = '0';
          btn.disabled = false;
        }
      };
    };

    window.sendWhatsAppInvoice = async (orderId) => {
      const [order, settings] = await Promise.all([
        DBService.getOrderById(orderId),
        DBService.getSettings()
      ]);
      if (!order) {
        NotificationService.showToast('Order not found', 'error');
        return;
      }

      let rawPhone = (order.customerPhone || '').replace(/\D/g, '');
      if (rawPhone.length === 10) {
        rawPhone = '91' + rawPhone;
      }

      if (!rawPhone) {
        NotificationService.showToast('Customer phone number is missing.', 'warning');
        return;
      }

      const orderTotal = formatCurrency(order.pricing?.total);
      const fileCount = order.files ? order.files.length : 0;
      const statusEmoji = order.status === 'Completed' ? '✅' : order.status === 'Printing' ? '🖨️' : '⚡';

      const invoiceUrl = `${window.location.origin}${window.location.pathname}#track?id=${order.id}`;

      const message = `Hello ${order.customerName || 'Customer'} 👋,

Here is your Order & Payment Invoice from *${settings.shopName || 'TEAM 7 SYSTEM SOLUTION'}*:

📄 *Order ID:* ${order.id}
📌 *Status:* ${statusEmoji} ${order.status}
🖨️ *Documents:* ${fileCount} file(s) (${order.options?.paperSize || 'A4'} ${order.options?.colorMode || 'B&W'})
💳 *Payment UTR:* ${order.payment?.utr || 'N/A'}
💰 *Grand Total:* ${orderTotal}

🔍 *View Printing Invoice & Track Order Timeline:*
${invoiceUrl}

Thank you for choosing ${settings.shopName}!
📞 Shop Support: ${settings.phone}`;

      const encodedMessage = encodeURIComponent(message);
      const waUrl = `https://wa.me/${rawPhone}?text=${encodedMessage}`;

      window.open(waUrl, '_blank');
      NotificationService.showToast(`Opening WhatsApp chat for Order ${order.id}...`, 'success');
    };

    // Table Search Filter Logic
    const searchField = document.getElementById('order-search-field');
    const statusFilter = document.getElementById('order-status-filter');

    const applyFilters = () => {
      const q = searchField?.value.trim().toLowerCase() || '';
      const st = statusFilter?.value || '';
      let visibleCount = 0;

      orders.forEach(o => {
        const row = document.getElementById(`order-row-${o.id}`);
        if (!row) return;
        const idStr = (o.id || '').toLowerCase();
        const nameStr = (o.customerName || '').toLowerCase();
        const phoneStr = (o.customerPhone || '').toLowerCase();
        const utrStr = (o.payment?.utr || '').toLowerCase();
        const addrStr = (o.customerAddress || '').toLowerCase();
        const zoneStr = (o.pricing?.deliveryZone || '').toLowerCase();

        const matchQ = !q || idStr.includes(q) || nameStr.includes(q) || phoneStr.includes(q) || utrStr.includes(q) || addrStr.includes(q) || zoneStr.includes(q);
        const matchSt = !st || o.status === st;

        const visible = matchQ && matchSt;
        row.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      const noMatchRow = document.getElementById('order-no-match-row');
      if (noMatchRow) {
        noMatchRow.style.display = (visibleCount === 0 && orders.length > 0) ? '' : 'none';
      }
    };

    searchField?.addEventListener('input', applyFilters);
    statusFilter?.addEventListener('change', (e) => {
      window.filterPipelineByPill(e.target.value);
    });
    if (paramId) applyFilters();

    // --- LIVE REALTIME RECEPTION & SYNC ENGINE FOR ADMIN PIPELINE ---
    if (window._adminPipelineSyncTimer) {
      clearInterval(window._adminPipelineSyncTimer);
    }

    let previousOrderCount = orders.length;

    window._adminPipelineSyncTimer = setInterval(async () => {
      // Auto-stop if user navigated away from pipeline page
      if (!window.location.hash.startsWith('#admin-orders')) {
        clearInterval(window._adminPipelineSyncTimer);
        window._adminPipelineSyncTimer = null;
        return;
      }

      const freshOrders = await DBService.getOrders();
      if (freshOrders.length > previousOrderCount) {
        const diff = freshOrders.length - previousOrderCount;
        previousOrderCount = freshOrders.length;
        NotificationService.showToast(`🔔 ${diff} New Customer Order(s) Received! Live updating pipeline...`, 'success');
        this.renderOrders(queryStr);
      } else {
        freshOrders.forEach(fo => {
          const target = orders.find(o => o.id === fo.id);
          if (target && target.status !== fo.status) {
            target.status = fo.status;
            const selectEl = document.querySelector(`#order-row-${fo.id} select`);
            if (selectEl) selectEl.value = fo.status;
          }
        });
        updatePipelineCounts();
        applyFilters();
      }
    }, 5000);
  },

  // --- PRICING & PRODUCTS MANAGEMENT EDITOR (FULL CRUD) ---
  async renderPricing() {
    // Load pricing from Firebase, update PricingEngine in-memory cache
    const pricing = await DBService.getPricing();
    const settings = await DBService.getSettings();
    await PricingEngine.preload(DBService);

    const html = `
      <div class="table-card mb-4">
        <div class="table-toolbar" style="flex-wrap:wrap; gap:1rem;">
          <div>
            <h3>Dynamic Price & Product Manager (CRUD)</h3>
            <p class="text-muted" style="font-size:0.85rem;">Create, edit, or delete paper sizes, GSM qualities, binding choices, color rates, and delivery charges with full CRUD control.</p>
          </div>
          <div style="display:flex; gap:0.75rem; align-items:center;">
            <a href="#admin-catalog" class="btn btn-outline">🛠️ Manage Services Catalog (CRUD)</a>
            <button class="btn btn-success" id="btn-save-all-pricing">💾 Save Price Updates</button>
          </div>
        </div>

        <div style="padding:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:2rem;">
          
          <!-- 1. Paper Base Rates (CRUD) -->
          <div class="glass-panel" style="padding:1.25rem; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem;">
              <h4 style="margin:0; font-size:1.05rem; color:var(--primary);">📄 Paper Sizes & Base Rates (per page)</h4>
              <button class="btn btn-sm btn-primary" onclick="window.openAddPaperSizeModal()">➕ Add Size</button>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:0.85rem;">
              ${Object.entries(pricing.paperSizes || {}).map(([size, item]) => `
                <div style="background:var(--bg-card); padding:0.75rem 1rem; border-radius:10px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:0.9rem;">${size}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${item.label || size}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:0.8rem; font-weight:600;">₹</span>
                    <input type="number" step="0.25" min="0" class="form-control form-control-sm price-input-field" data-type="paperSizes" data-key="${size}" data-prop="baseRate" value="${item.baseRate}" style="width:85px; font-weight:700;">
                    <button class="btn btn-sm btn-danger" style="font-size:0.7rem; padding:0.25rem 0.45rem;" onclick="window.deletePaperSize('${size}')" title="Delete Paper Size">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 2. Paper Qualities (GSM) & Multipliers (CRUD) -->
          <div class="glass-panel" style="padding:1.25rem; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem;">
              <h4 style="margin:0; font-size:1.05rem; color:var(--primary);">📜 Paper Qualities (GSM) Multipliers</h4>
              <button class="btn btn-sm btn-primary" onclick="window.openAddPaperQualityModal()">➕ Add Quality</button>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.85rem;">
              ${Object.entries(pricing.paperQualities || {}).map(([quality, item]) => `
                <div style="background:var(--bg-card); padding:0.75rem 1rem; border-radius:10px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:0.9rem;">${quality}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${item.label || quality}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:0.75rem; color:var(--text-muted);">x</span>
                    <input type="number" step="0.1" min="0.1" class="form-control form-control-sm price-input-field" data-type="paperQualities" data-key="${quality}" data-prop="multiplier" value="${item.multiplier}" style="width:85px; font-weight:700;">
                    <button class="btn btn-sm btn-danger" style="font-size:0.7rem; padding:0.25rem 0.45rem;" onclick="window.deletePaperQuality('${quality}')" title="Delete Quality">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 3. Book Binding Costs (CRUD) -->
          <div class="glass-panel" style="padding:1.25rem; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem;">
              <h4 style="margin:0; font-size:1.05rem; color:var(--primary);">📚 Book Binding Options & Rates (CRUD)</h4>
              <button class="btn btn-sm btn-primary" onclick="window.openAddBindingModal()">➕ Add Binding</button>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.85rem;">
              ${Object.entries(pricing.bindings || {}).map(([name, item]) => `
                <div style="background:var(--bg-card); padding:0.85rem 1rem; border-radius:10px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:0.5rem;">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
                    <div style="flex:1;">
                      <div style="font-weight:700; font-size:0.9rem; color:var(--primary);">📚 ${name}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                      <span style="font-size:0.8rem; font-weight:600;">₹</span>
                      <input type="number" step="5" min="0" class="form-control form-control-sm price-input-field" data-type="bindings" data-key="${name}" data-prop="price" value="${item.price}" style="width:85px; font-weight:700;">
                      <button class="btn btn-sm btn-outline" style="font-size:0.7rem; padding:0.25rem 0.45rem;" onclick="window.openAddBindingModal('${name}')" title="Edit Binding & Explanation">✏️ Edit</button>
                      ${name !== 'None' ? `
                        <button class="btn btn-sm btn-danger" style="font-size:0.7rem; padding:0.25rem 0.45rem;" onclick="window.deleteBinding('${name}')" title="Delete Binding Option">🗑️</button>
                      ` : ''}
                    </div>
                  </div>
                  <div style="font-size:0.78rem; color:var(--text-muted); background:var(--bg-body); padding:0.4rem 0.6rem; border-radius:6px; border:1px solid var(--border-color);">
                    💡 <b>Explanation ("What is binding?"):</b> ${item.description || item.label || 'Standard document binding finish.'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 4. Color & Extra Finishing Rates (CRUD) -->
          <div class="glass-panel" style="padding:1.25rem; border-radius:12px; grid-column: span 2;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.6rem; flex-wrap:wrap; gap:0.5rem;">
              <h4 style="margin:0; font-size:1.05rem; color:var(--primary);">🎨 Color & Extra Finishing Rates</h4>
              <button class="btn btn-sm btn-primary" onclick="window.openAddFinishingModal()">➕ Add Finishing Option</button>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
              <!-- Standard Color Page Surcharge Rate -->
              <div style="background:var(--bg-card); padding:1rem; border-radius:10px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:1rem;">
                <div>
                  <div style="font-weight:700; font-size:0.925rem; color:var(--primary);">🎨 Color Page Surcharge Rate</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Additional surcharge per color page printed</div>
                </div>
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span style="font-size:0.85rem; font-weight:700;">+₹</span>
                  <input type="number" step="0.5" min="0" class="form-control form-control-sm price-input-field" data-type="colorModes" data-key="Color" data-prop="costPerPage" value="${pricing.colorModes?.['Color']?.costPerPage || 6.00}" style="width:90px; font-weight:700;">
                </div>
              </div>

              <!-- List of Dynamic Finishing / Lamination Options (CRUD) -->
              ${Object.entries(pricing.lamination || {}).map(([key, item]) => `
                <div style="background:var(--bg-card); padding:1rem; border-radius:10px; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:1rem;">
                  <div style="flex:1;">
                    <div style="font-weight:700; font-size:0.9rem;">🛡️ ${key}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">${item.label || key}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:0.8rem; font-weight:600;">₹</span>
                    <input type="number" step="0.5" min="0" class="form-control form-control-sm price-input-field" data-type="lamination" data-key="${key}" data-prop="pricePerPage" value="${item.pricePerPage || 0}" style="width:85px; font-weight:700;">
                    ${key !== 'No' ? `
                      <button class="btn btn-sm btn-danger" style="font-size:0.7rem; padding:0.25rem 0.45rem;" onclick="window.deleteFinishingOption('${key}')" title="Delete Finishing Option">🗑️</button>
                    ` : '<span class="badge badge-approved" style="font-size:0.68rem;">Default</span>'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 5. Weight-Based Home Delivery Pricing -->
          <div class="glass-panel" style="padding:1.25rem; border-radius:12px; grid-column:span 2; border:1.5px solid rgba(37,99,235,.25);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid var(--border-color);padding-bottom:.75rem;gap:1rem;flex-wrap:wrap;">
              <div>
                <h4 style="margin:0;font-size:1.05rem;color:var(--primary);">🚚 Home Delivery — KG Pricing</h4>
                <p class="text-muted" style="font-size:.78rem;margin:.25rem 0 0;">
                  Customer delivery charge is calculated from total package weight. Store Pickup is always free.
                </p>
              </div>
              <span class="badge badge-approved" style="font-size:.72rem;">WEIGHT BASED</span>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">
              <div class="form-group">
                <label class="form-label">Base Weight (KG)</label>
                <input type="number" step="0.01" min="0.01" class="form-control" id="pricing-courier-base-kg"
                  value="${Number(settings.courierPricing?.baseWeightKg ?? 1)}">
                <small class="text-muted">Included in base price</small>
              </div>
              <div class="form-group">
                <label class="form-label">Base Price (₹)</label>
                <input type="number" step="0.01" min="0" class="form-control" id="pricing-courier-base-cost"
                  value="${Number(settings.courierPricing?.baseCost ?? 60)}">
                <small class="text-muted">Example: 1 KG = ₹60</small>
              </div>
              <div class="form-group">
                <label class="form-label">Additional Slab (KG)</label>
                <input type="number" step="0.01" min="0.01" class="form-control" id="pricing-courier-add-kg"
                  value="${Number(settings.courierPricing?.additionalWeightKg ?? 0.5)}">
                <small class="text-muted">Example: 0.5 KG</small>
              </div>
              <div class="form-group">
                <label class="form-label">Additional Slab Price (₹)</label>
                <input type="number" step="0.01" min="0" class="form-control" id="pricing-courier-add-cost"
                  value="${Number(settings.courierPricing?.additionalCost ?? 40)}">
                <small class="text-muted">Example: +₹40 per slab</small>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
              <div class="form-group">
                <label class="form-label">Default Packing Weight (g)</label>
                <input type="number" step="1" min="0" class="form-control" id="pricing-courier-pack-g"
                  value="${Number(settings.courierPricing?.packagingWeightGrams ?? 50)}">
              </div>
              <div class="form-group">
                <label class="form-label">Binding Weight per Set (g)</label>
                <input type="number" step="1" min="0" class="form-control" id="pricing-courier-bind-g"
                  value="${Number(settings.courierPricing?.bindingWeightGrams ?? 30)}">
              </div>
            </div>

            <div style="margin-top:.75rem;padding:.75rem 1rem;background:var(--bg-body);border-radius:9px;border:1px solid var(--border-color);font-size:.8rem;">
              <b>Example:</b> 0–1 KG = ₹60 &nbsp;•&nbsp; 1.001–1.5 KG = ₹100 &nbsp;•&nbsp; 1.501–2 KG = ₹140.
              The customer-facing delivery fee uses these settings for <b>Home Delivery</b> only.
            </div>
          </div>

          <!-- 5. Area-Wise Delivery Charges & Zones (CRUD) -->
          <div style="grid-column: span 2; border-top:1px solid var(--border-color); padding-top:1.5rem; margin-top:0.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid var(--border-color); padding-bottom:0.85rem; flex-wrap:wrap; gap:1rem;">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <h4 style="margin:0;">🚚 Area-Wise Delivery Charges & Zones</h4>
                <span class="badge" style="background:var(--primary-light); color:var(--primary); font-weight:700; font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:12px; border:1px solid var(--border-color);">
                  ${Object.keys(pricing.deliveryZones || {}).length} Total Zones
                </span>
              </div>

              <div style="display:flex; gap:0.75rem; align-items:center; flex-grow:1; max-width:440px; justify-content:flex-end;">
                <div style="position:relative; width:100%; max-width:260px;">
                  <input type="text" class="form-control form-control-sm" id="delivery-zone-search-input" placeholder="🔍 Search area or zone name..." style="padding-left:2.1rem; border-radius:20px;">
                  <span style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); font-size:0.8rem; opacity:0.6;">🔍</span>
                </div>
                <button class="btn btn-sm btn-primary" onclick="window.openAddDeliveryZoneModal()" style="white-space:nowrap;">➕ Add New Zone</button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;" id="delivery-zones-grid">
              ${Object.entries(pricing.deliveryZones || {}).map(([zone, item]) => `
                <div class="glass-panel zone-card-item" data-zone-key="${zone.toLowerCase()}" data-zone-label="${(item.label || '').toLowerCase()}" style="padding:1.1rem; border-radius:12px; position:relative;">
                  <div style="font-weight:700; font-size:0.9rem; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:var(--primary);">📍 ${zone}</span>
                    ${zone !== 'Pickup' ? `
                      <button class="btn btn-sm btn-danger" style="font-size:0.7rem; padding:0.15rem 0.4rem;" onclick="window.deleteDeliveryZone('${zone}')">🗑️ Delete Zone</button>
                    ` : '<span class="badge badge-approved" style="font-size:0.7rem;">Default</span>'}
                  </div>

                  <div class="form-group mb-2">
                    <label class="form-label" style="font-size:0.75rem;">Customer Display Label</label>
                    <input type="text" class="form-control form-control-sm zone-label-field" data-key="${zone}" value="${item.label}">
                  </div>

                  <div class="form-group mb-0">
                    <label class="form-label" style="font-size:0.75rem;">Delivery Fee (₹)</label>
                    <input type="number" step="5" min="0" class="form-control form-control-sm price-input-field" data-type="deliveryZones" data-key="${zone}" data-prop="fee" value="${item.fee}">
                  </div>
                </div>
              `).join('')}

              <div id="no-zone-match-msg" style="display:none; grid-column:span 2; text-align:center; padding:2.5rem 1rem; color:var(--text-muted); background:var(--bg-card); border-radius:12px; border:1px dashed var(--border-color);">
                <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
                <h5>No delivery zones match your search</h5>
                <p style="font-size:0.85rem; margin-top:0.25rem;">Try searching for a different area name or clear the search input field.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.renderAdminLayout('pricing', html);

    // Live Search Filter for Delivery Zones
    const zoneSearchInput = document.getElementById('delivery-zone-search-input');
    if (zoneSearchInput) {
      zoneSearchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        const cards = document.querySelectorAll('.zone-card-item');
        let visibleCount = 0;
        cards.forEach(card => {
          const key = card.dataset.zoneKey || '';
          const label = card.dataset.zoneLabel || '';
          const matches = !val || key.includes(val) || label.includes(val);
          card.style.display = matches ? '' : 'none';
          if (matches) visibleCount++;
        });

        const noMatchMsg = document.getElementById('no-zone-match-msg');
        if (noMatchMsg) {
          noMatchMsg.style.display = (visibleCount === 0 && cards.length > 0) ? '' : 'none';
        }
      });
    }

    document.getElementById('btn-save-all-pricing').onclick = () => {
      const inputs = document.querySelectorAll('.price-input-field');
      inputs.forEach(input => {
        const type = input.dataset.type;
        const key = input.dataset.key;
        const prop = input.dataset.prop;
        const val = parseFloat(input.value) || 0;
        if (pricing[type] && pricing[type][key]) {
          pricing[type][key][prop] = val;
        }
      });

      const labelInputs = document.querySelectorAll('.zone-label-field');
      labelInputs.forEach(input => {
        const key = input.dataset.key;
        if (pricing.deliveryZones && pricing.deliveryZones[key]) {
          pricing.deliveryZones[key].label = input.value;
        }
      });

      const courierPricing = {
        ...(settings.courierPricing || {}),
        baseWeightKg: Math.max(0.01, Number(document.getElementById('pricing-courier-base-kg')?.value) || 1),
        baseCost: Math.max(0, Number(document.getElementById('pricing-courier-base-cost')?.value) || 60),
        additionalWeightKg: Math.max(0.01, Number(document.getElementById('pricing-courier-add-kg')?.value) || 0.5),
        additionalCost: Math.max(0, Number(document.getElementById('pricing-courier-add-cost')?.value) || 40),
        packagingWeightGrams: Math.max(0, Number(document.getElementById('pricing-courier-pack-g')?.value) || 0),
        bindingWeightGrams: Math.max(0, Number(document.getElementById('pricing-courier-bind-g')?.value) || 0),
        freeDelivery: false
      };

      const updatedSettings = { ...settings, courierPricing };
      Promise.all([
        PricingEngine.savePricingData(pricing, DBService),
        DBService.saveSettings(updatedSettings)
      ]).then(() => {
        if (window.refreshShopSettingsUI) window.refreshShopSettingsUI(updatedSettings);
        NotificationService.showToast('All pricing + KG delivery settings saved successfully!', 'success');
      }).catch((err) => {
        console.error('[PRICING] Save failed:', err);
        NotificationService.showToast('Failed to save pricing settings.', 'error');
      });
    };

    // Paper Size Add Modal & Handler
    window.openAddPaperSizeModal = () => {
      const modalHTML = `
        <form id="add-paper-size-form" onsubmit="event.preventDefault(); window.saveNewPaperSize();">
          <div class="form-group mb-3">
            <label class="form-label">Paper Size Code / Name *</label>
            <input type="text" class="form-control" id="new-size-name" placeholder="E.g., A2, B5, Arch D" required autofocus>
          </div>
          <div class="form-group mb-3">
            <label class="form-label">Base Rate per Page (₹) *</label>
            <input type="number" step="0.25" min="0" class="form-control" id="new-size-rate" value="5.00" required>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Display Label *</label>
            <input type="text" class="form-control" id="new-size-label" placeholder="E.g., A2 Poster (420 x 594 mm)" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="if(window.ModalComponent) window.ModalComponent.close();">Cancel</button>
            <button type="submit" class="btn btn-success">➕ Add Paper Size</button>
          </div>
        </form>
      `;
      (ModalComponent || window.ModalComponent).show({
        title: `📄 Add New Paper Size Option`,
        bodyHTML: modalHTML,
        width: '500px'
      });
    };

    window.saveNewPaperSize = () => {
      const name = document.getElementById('new-size-name')?.value.trim();
      const baseRate = parseFloat(document.getElementById('new-size-rate')?.value) || 0;
      const label = document.getElementById('new-size-label')?.value.trim();

      if (!name || !label) {
        NotificationService.showToast('Please fill out size name and label.', 'warning');
        return;
      }

      if (!pricing.paperSizes) pricing.paperSizes = {};
      pricing.paperSizes[name] = { baseRate, label };
      PricingEngine.savePricingData(pricing, DBService);
      if (window.ModalComponent) window.ModalComponent.close();
      NotificationService.showToast(`Paper Size "${name}" added successfully!`, 'success');
      this.renderPricing();
    };

    window.deletePaperSize = (sizeKey) => {
      if (confirm(`🗑️ Delete Paper Size "${sizeKey}"? Customers will no longer be able to select this size.`)) {
        delete pricing.paperSizes[sizeKey];
        PricingEngine.savePricingData(pricing, DBService);
        NotificationService.showToast(`Paper Size "${sizeKey}" deleted.`, 'info');
        this.renderPricing();
      }
    };

    // Paper Quality Add Modal & Handler
    window.openAddPaperQualityModal = () => {
      const modalHTML = `
        <form id="add-paper-quality-form" onsubmit="event.preventDefault(); window.saveNewPaperQuality();">
          <div class="form-group mb-3">
            <label class="form-label">Paper Quality GSM / Type Name *</label>
            <input type="text" class="form-control" id="new-quality-name" placeholder="E.g., 120 GSM, Velvet Matte, Canvas" required autofocus>
          </div>
          <div class="form-group mb-3">
            <label class="form-label">Price Multiplier (e.g. 1.0 = standard, 1.5 = +50%) *</label>
            <input type="number" step="0.1" min="0.1" class="form-control" id="new-quality-multiplier" value="1.5" required>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Display Label *</label>
            <input type="text" class="form-control" id="new-quality-label" placeholder="E.g., 120 GSM Heavy Cardstock" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="if(window.ModalComponent) window.ModalComponent.close();">Cancel</button>
            <button type="submit" class="btn btn-success">➕ Add Paper Quality</button>
          </div>
        </form>
      `;
      (ModalComponent || window.ModalComponent).show({
        title: `📜 Add New Paper Quality (GSM)`,
        bodyHTML: modalHTML,
        width: '500px'
      });
    };

    window.saveNewPaperQuality = () => {
      const name = document.getElementById('new-quality-name')?.value.trim();
      const multiplier = parseFloat(document.getElementById('new-quality-multiplier')?.value) || 1.0;
      const label = document.getElementById('new-quality-label')?.value.trim();

      if (!name || !label) {
        NotificationService.showToast('Please fill out quality name and label.', 'warning');
        return;
      }

      if (!pricing.paperQualities) pricing.paperQualities = {};
      pricing.paperQualities[name] = { multiplier, label };
      PricingEngine.savePricingData(pricing, DBService);
      if (window.ModalComponent) window.ModalComponent.close();
      NotificationService.showToast(`Paper Quality "${name}" added!`, 'success');
      this.renderPricing();
    };

    window.deletePaperQuality = (qualityKey) => {
      if (confirm(`🗑️ Delete Paper Quality "${qualityKey}"?`)) {
        delete pricing.paperQualities[qualityKey];
        PricingEngine.savePricingData(pricing, DBService);
        NotificationService.showToast(`Paper Quality "${qualityKey}" deleted.`, 'info');
        this.renderPricing();
      }
    };

    // Binding Add/Edit Modal & Handler
    window.openAddBindingModal = (bindingKey = null) => {
      const item = bindingKey ? pricing.bindings[bindingKey] : null;
      const modalHTML = `
        <form id="add-binding-form" onsubmit="event.preventDefault(); window.saveNewBinding('${bindingKey || ''}');">
          <div class="form-group mb-3">
            <label class="form-label">Binding Type Name *</label>
            <input type="text" class="form-control" id="new-binding-name" value="${bindingKey || ''}" placeholder="E.g., Spiral, Soft Cover, Hard Bound, Comb Binding" required ${bindingKey === 'None' ? 'readonly' : ''} autofocus>
          </div>
          <div class="form-group mb-3">
            <label class="form-label">Price per Book (₹) *</label>
            <input type="number" step="5" min="0" class="form-control" id="new-binding-price" value="${item ? item.price : 35}" required>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Customer Explanation Text ("What is Binding?") *</label>
            <textarea class="form-control" id="new-binding-desc" rows="3" placeholder="Explain what this binding option is for customers..." required>${item ? (item.description || item.label || '') : ''}</textarea>
            <span style="font-size:0.72rem; color:var(--text-muted); margin-top:0.25rem; display:block;">This description is shown to customers when they click "ℹ️ What is binding?"</span>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="if(window.ModalComponent) window.ModalComponent.close();">Cancel</button>
            <button type="submit" class="btn btn-success">💾 ${bindingKey ? 'Update Binding Option' : 'Add Binding Option'}</button>
          </div>
        </form>
      `;
      (ModalComponent || window.ModalComponent).show({
        title: bindingKey ? `✏️ Edit Binding Option: "${bindingKey}"` : `📚 Add New Book Binding Option`,
        bodyHTML: modalHTML,
        width: '560px'
      });
    };

    window.saveNewBinding = (origKey = '') => {
      const name = document.getElementById('new-binding-name')?.value.trim();
      const price = parseFloat(document.getElementById('new-binding-price')?.value) || 0;
      const description = document.getElementById('new-binding-desc')?.value.trim() || '';

      if (!name) {
        NotificationService.showToast('Please enter a binding name.', 'warning');
        return;
      }

      if (!pricing.bindings) pricing.bindings = {};
      if (origKey && origKey !== name) {
        delete pricing.bindings[origKey];
      }

      pricing.bindings[name] = { price, description, label: description };
      PricingEngine.savePricingData(pricing, DBService);
      if (window.ModalComponent) window.ModalComponent.close();
      NotificationService.showToast(`Binding Option "${name}" updated successfully!`, 'success');
      this.renderPricing();
    };

    window.deleteBinding = (bindingKey) => {
      if (confirm(`🗑️ Delete Binding Option "${bindingKey}"?`)) {
        delete pricing.bindings[bindingKey];
        PricingEngine.savePricingData(pricing, DBService);
        NotificationService.showToast(`Binding Option "${bindingKey}" deleted.`, 'info');
        this.renderPricing();
      }
    };

    // Finishing / Lamination Add Modal & Handlers
    window.openAddFinishingModal = () => {
      const modalHTML = `
        <form id="add-finishing-form" onsubmit="event.preventDefault(); window.saveNewFinishingOption();">
          <div class="form-group mb-3">
            <label class="form-label">Finishing Option Name *</label>
            <input type="text" class="form-control" id="new-finishing-name" placeholder="E.g., Matt Velvet Lamination, Hole Punching, UV Gloss" required autofocus>
          </div>
          <div class="form-group mb-3">
            <label class="form-label">Rate per Page / Unit (₹) *</label>
            <input type="number" step="0.5" min="0" class="form-control" id="new-finishing-rate" value="15.00" required>
          </div>
          <div class="form-group mb-4">
            <label class="form-label">Customer Display Label *</label>
            <input type="text" class="form-control" id="new-finishing-label" placeholder="E.g., Premium Soft-Touch Velvet Thermal Lamination" required>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="if(window.ModalComponent) window.ModalComponent.close();">Cancel</button>
            <button type="submit" class="btn btn-success">➕ Save Finishing Option</button>
          </div>
        </form>
      `;
      (ModalComponent || window.ModalComponent).show({
        title: `🛡️ Add New Finishing / Lamination Option`,
        bodyHTML: modalHTML,
        width: '520px'
      });
    };

    window.saveNewFinishingOption = () => {
      const name = document.getElementById('new-finishing-name')?.value.trim();
      const pricePerPage = parseFloat(document.getElementById('new-finishing-rate')?.value) || 0;
      const label = document.getElementById('new-finishing-label')?.value.trim();

      if (!name || !label) {
        NotificationService.showToast('Please enter finishing name and display label.', 'warning');
        return;
      }

      if (!pricing.lamination) pricing.lamination = {};
      pricing.lamination[name] = { pricePerPage, label };
      PricingEngine.savePricingData(pricing, DBService);
      if (window.ModalComponent) window.ModalComponent.close();
      NotificationService.showToast(`Finishing Option "${name}" added!`, 'success');
      this.renderPricing();
    };

    window.deleteFinishingOption = (finishingKey) => {
      if (finishingKey === 'No') {
        NotificationService.showToast('Cannot delete default "No Lamination" option.', 'warning');
        return;
      }
      if (confirm(`🗑️ Delete Finishing Option "${finishingKey}"?`)) {
        if (pricing.lamination && pricing.lamination[finishingKey]) {
          delete pricing.lamination[finishingKey];
          PricingEngine.savePricingData(pricing, DBService);
          NotificationService.showToast(`Finishing Option "${finishingKey}" deleted.`, 'info');
          this.renderPricing();
        }
      }
    };

    window.openAddDeliveryZoneModal = () => {
      const modalHTML = `
        <form id="add-zone-form" onsubmit="event.preventDefault(); window.saveNewDeliveryZone();">
          <div class="form-group mb-3">
            <label class="form-label">Delivery Zone Name *</label>
            <input type="text" class="form-control" id="new-zone-name" placeholder="E.g., Zone 4 (Avadi / Poonamallee)" required autofocus>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Delivery Fee Amount (₹) *</label>
            <input type="number" step="5" min="0" class="form-control" id="new-zone-fee" value="60" required>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Customer Display Label *</label>
            <input type="text" class="form-control" id="new-zone-label" placeholder="E.g., Western Zone 4 (Avadi Area) - ₹60" required>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="if(window.ModalComponent) window.ModalComponent.close(); else document.getElementById('active-modal-overlay')?.remove();">Cancel</button>
            <button type="submit" class="btn btn-success">➕ Save Delivery Zone</button>
          </div>
        </form>
      `;

      const modal = ModalComponent || window.ModalComponent;
      if (modal) {
        modal.show({
          title: `🚚 Add New Area Delivery Zone & Fee`,
          bodyHTML: modalHTML,
          width: '520px'
        });
      }
    };

    window.saveNewDeliveryZone = () => {
      const zoneName = document.getElementById('new-zone-name')?.value.trim();
      const fee = parseFloat(document.getElementById('new-zone-fee')?.value) || 0;
      const label = document.getElementById('new-zone-label')?.value.trim();

      if (!zoneName || !label) {
        NotificationService.showToast('Please enter zone name and label.', 'warning');
        return;
      }

      if (!pricing.deliveryZones) pricing.deliveryZones = {};
      pricing.deliveryZones[zoneName] = { fee, label };
      PricingEngine.savePricingData(pricing, DBService);

      if (window.ModalComponent) window.ModalComponent.close();
      NotificationService.showToast(`Delivery Zone "${zoneName}" added!`, 'success');
      this.renderPricing();
    };

    window.deleteDeliveryZone = (zoneName) => {
      if (zoneName === 'Pickup') {
        NotificationService.showToast('Cannot delete default Store Pickup zone.', 'warning');
        return;
      }
      if (confirm(`Are you sure you want to delete delivery zone "${zoneName}"?`)) {
        if (pricing.deliveryZones && pricing.deliveryZones[zoneName]) {
          delete pricing.deliveryZones[zoneName];
          PricingEngine.savePricingData(pricing, DBService);
          NotificationService.showToast(`Delivery Zone "${zoneName}" deleted!`, 'info');
          this.renderPricing();
        }
      }
    };
  },

  // --- CUSTOMER DIRECTORY ---
  async renderCustomers() {
    const customers = await DBService.getCustomers();

    const html = `
      <div class="table-card">
        <div class="table-toolbar">
          <h3>Customer Directory (${customers.length} registered)</h3>
          <button class="btn btn-sm btn-outline" id="btn-export-cust-excel">📊 Export to Excel CSV</button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Email</th>
                <th>Total Orders</th>
                <th>Total Revenue</th>
                <th>Last Order Date</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map(c => `
                <tr>
                  <td><b>${c.name}</b></td>
                  <td>${c.phone}</td>
                  <td>${c.email}</td>
                  <td><span class="badge badge-waiting">${c.totalOrders} order(s)</span></td>
                  <td><b>${formatCurrency(c.totalSpent)}</b></td>
                  <td>${formatDate(c.lastOrderDate)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    await this.renderAdminLayout('customers', html);

    document.getElementById('btn-export-cust-excel').onclick = () => {
      exportToCSV('Team7_Customers_Report.csv', customers);
      NotificationService.showToast('Customer directory exported to CSV!', 'success');
    };
  },

  // --- REPORTS & ANALYTICS FULL SYSTEM ---
  async renderBookingReport() {
    const bookings = await DBService.getBookingRequests(true);
    const html = `
      <div class="table-card mb-4">
        <div class="table-toolbar" style="flex-wrap:wrap;gap:1rem;">
          <div><h3>📅 T7 Shop Booking Report</h3><p class="text-muted" style="font-size:.85rem;">All T7 Shop service, design, sales and driver requests.</p></div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" id="btn-export-bookings-csv">📊 Export CSV</button>
            <a class="btn btn-sm btn-outline" href="#admin-reports">📈 Sales Report</a>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;padding:1rem;">
          <div class="metric-card"><b>${bookings.length}</b><span>Total</span></div>
          <div class="metric-card"><b>${bookings.filter(b=>b.status==='New').length}</b><span>New</span></div>
          <div class="metric-card"><b>${bookings.filter(b=>b.status==='Confirmed').length}</b><span>Confirmed</span></div>
          <div class="metric-card"><b>${bookings.filter(b=>b.status==='Completed').length}</b><span>Completed</span></div>
        </div>
        <div class="table-responsive" style="padding:0 1.5rem 1.5rem;">
          <table class="data-table"><thead><tr><th>Date</th><th>ID</th><th>Type</th><th>Item / Service</th><th>Customer</th><th>Phone</th><th>Preferred</th><th>Driver</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${bookings.length ? bookings.map(b=>`
            <tr>
              <td>${new Date(b.createdAt||Date.now()).toLocaleString('en-IN')}</td>
              <td><b>${esc(b.id)}</b></td>
              <td>${esc(b.type==='driver'?'Driver':b.type==='product'?'Sales':'Service')}</td>
              <td>${esc(b.itemService||'')}</td><td>${esc(b.customerName||'')}</td><td>${esc(b.customerPhone||'')}</td>
              <td>${esc(b.preferredDate||'—')} ${esc(b.preferredTime||'')}</td>
              <td>${b.type==='driver'?esc(`${b.driverType||''} | ${b.duration||''} | ${b.pickup||''} → ${b.dropRoute||''}`):'—'}</td>
              <td><select class="form-select booking-status-select" data-id="${esc(b.id)}">${['New','Contacted','Confirmed','Completed','Cancelled'].map(s=>`<option value="${s}" ${b.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
              <td><button class="btn btn-sm btn-outline booking-wa-btn" data-phone="${esc(b.customerPhone||'')}">💬 WhatsApp</button></td>
            </tr>`).join('') : `<tr><td colspan="10" class="text-center text-muted" style="padding:3rem;">No booking requests yet.</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
    await this.renderAdminLayout('booking-reports', html);
    document.querySelectorAll('.booking-status-select').forEach(el => el.addEventListener('change', async () => {
      try { await DBService.updateBookingStatus(el.dataset.id, el.value); NotificationService.showToast('Booking status updated.','success'); }
      catch(e) { NotificationService.showToast('Failed to update booking status.','error'); }
    }));
    document.querySelectorAll('.booking-wa-btn').forEach(btn => btn.addEventListener('click', () => {
      const p=String(btn.dataset.phone||'').replace(/\D/g,''); if(p) window.open(`https://wa.me/${p.length===10?'91'+p:p}`,'_blank','noopener');
    }));
    document.getElementById('btn-export-bookings-csv')?.addEventListener('click', () => {
      exportToCSV('T7_Shop_Booking_Report.csv', bookings.map(b=>({BookingID:b.id,CreatedAt:b.createdAt,Type:b.type,ItemService:b.itemService,Customer:b.customerName,Phone:b.customerPhone,PreferredDate:b.preferredDate,PreferredTime:b.preferredTime,DriverType:b.driverType,Duration:b.duration,Pickup:b.pickup,DropRoute:b.dropRoute,Details:b.details,Status:b.status})));
    });
  },

  async renderReports(queryStr = '') {
    const orders = await DBService.getOrders();
    if (new URLSearchParams(queryStr || '').get('view') === 'bookings') return this.renderBookingReport();

    const html = `
      <div class="table-card mb-4">
        <div class="table-toolbar" style="flex-wrap:wrap; gap:1rem;">
          <div>
            <h3>📊 Full Executive Business Performance & Financial Reports</h3>
            <p class="text-muted" style="font-size:0.85rem;">Filter sales records, analyze paper volume, track delivery revenues, and export full transaction ledgers.</p>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn btn-sm btn-outline" id="btn-print-report-summary">🖨️ Print Summary Report</button>
            <button class="btn btn-sm btn-primary" id="btn-export-sales-csv">📊 Export Full Sales Ledger (CSV)</button>
          </div>
        </div>

        <!-- Filter Control Toolbar -->
        <div style="background:var(--bg-card); padding:1rem 1.5rem; border-bottom:1px solid var(--border-color); display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">Period:</span>
            <select class="form-select form-select-sm" id="report-period-filter" style="width:160px;">
              <option value="all" selected>All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div id="custom-date-container" style="display:none; gap:0.5rem; align-items:center;">
            <input type="date" class="form-control form-control-sm" id="report-date-from" style="width:140px;">
            <span style="font-size:0.8rem; color:var(--text-muted);">to</span>
            <input type="date" class="form-control form-control-sm" id="report-date-to" style="width:140px;">
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-weight:700; font-size:0.85rem; color:var(--text-muted);">Status Filter:</span>
            <select class="form-select form-select-sm" id="report-status-filter" style="width:170px;">
              <option value="all" selected>All Orders</option>
              <option value="valid">Valid Net Orders (Non-Rejected)</option>
              <option value="Completed">Completed Only</option>
              <option value="Rejected">Rejected / Deducted Only</option>
            </select>
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem; margin-left:auto;">
            <input type="text" class="form-control form-control-sm" id="report-search-ledger" placeholder="Search Order ID, Customer, UTR..." style="width:200px;">
          </div>
        </div>

        <!-- Metrics Grid Cards -->
        <div style="padding:1.5rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.25rem;" id="report-metrics-grid">
          <!-- Dynamically Populated Metrics -->
        </div>

        <!-- Sales Ledger Table -->
        <div class="table-responsive" style="padding:0 1.5rem 1.5rem;">
          <h4 style="margin-bottom:1rem; font-size:1.1rem;">📑 Itemized Sales & Transaction Ledger</h4>
          <table class="data-table" id="report-ledger-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Order ID</th>
                <th>Customer Info</th>
                <th>Delivery Area</th>
                <th>Files & Pages</th>
                <th>Delivery Fee</th>
                <th>Total Paid</th>
                <th>UTR Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="report-ledger-body">
              <!-- Dynamically Populated Rows -->
            </tbody>
            <tfoot id="report-ledger-foot" style="font-weight:700; background:rgba(0,0,0,0.03);">
              <!-- Dynamically Populated Foot Totals -->
            </tfoot>
          </table>
        </div>
      </div>
    `;

    await this.renderAdminLayout('reports', html);

    // Dynamic Filter Engine
    const periodSelect = document.getElementById('report-period-filter');
    const customContainer = document.getElementById('custom-date-container');
    const dateFromInput = document.getElementById('report-date-from');
    const dateToInput = document.getElementById('report-date-to');
    const statusSelect = document.getElementById('report-status-filter');
    const searchLedgerInput = document.getElementById('report-search-ledger');

    periodSelect.onchange = () => {
      customContainer.style.display = periodSelect.value === 'custom' ? 'flex' : 'none';
      applyReportFilters();
    };

    [dateFromInput, dateToInput, statusSelect, searchLedgerInput].forEach(el => {
      el?.addEventListener('input', applyReportFilters);
      el?.addEventListener('change', applyReportFilters);
    });

    function applyReportFilters() {
      const period = periodSelect.value;
      const statusF = statusSelect.value;
      const searchQ = (searchLedgerInput.value || '').toLowerCase().trim();

      const now = new Date();
      const todayStr = new Date().toISOString().slice(0, 10);

      const filtered = orders.filter(o => {
        const oDate = new Date(o.createdAt || Date.now());
        const oDateStr = oDate.toISOString().slice(0, 10);

        // Period filter
        if (period === 'today') {
          if (oDateStr !== todayStr) return false;
        } else if (period === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (oDate < oneWeekAgo) return false;
        } else if (period === 'month') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (oDate < oneMonthAgo) return false;
        } else if (period === 'custom') {
          const fromV = dateFromInput.value;
          const toV = dateToInput.value;
          if (fromV && oDateStr < fromV) return false;
          if (toV && oDateStr > toV) return false;
        }

        // Status filter
        if (statusF === 'valid') {
          if (o.status === 'Rejected') return false;
        } else if (statusF !== 'all') {
          if (o.status !== statusF) return false;
        }

        // Search query
        if (searchQ) {
          const idStr = (o.id || '').toLowerCase();
          const nameStr = (o.customerName || '').toLowerCase();
          const phoneStr = (o.customerPhone || '').toLowerCase();
          const utrStr = (o.payment?.utr || '').toLowerCase();
          const areaStr = (o.pricing?.deliveryZone || '').toLowerCase();
          if (!idStr.includes(searchQ) && !nameStr.includes(searchQ) && !phoneStr.includes(searchQ) && !utrStr.includes(searchQ) && !areaStr.includes(searchQ)) {
            return false;
          }
        }

        return true;
      });

      // Recalculate Financial Metrics
      const validOrders = filtered.filter(o => o.status !== 'Rejected');
      const rejectedOrders = filtered.filter(o => o.status === 'Rejected');

      const netRevenue = validOrders.reduce((acc, o) => acc + (o.pricing?.total || 0), 0);
      const totalDeliveryFees = validOrders.reduce((acc, o) => acc + (o.pricing?.deliveryFee || 0), 0);
      const rejectedAmount = rejectedOrders.reduce((acc, o) => acc + (o.pricing?.total || 0), 0);
      const avgOrderValue = validOrders.length ? netRevenue / validOrders.length : 0;

      let totalPagesPrinted = 0;
      validOrders.forEach(o => {
        const filesList = (o.files && o.files.length > 0) ? o.files : (o.file ? [o.file] : []);
        filesList.forEach(f => {
          const copies = (f.options || o.options)?.copies || 1;
          const pages = f.pages || 1;
          totalPagesPrinted += (pages * copies);
        });
      });

      // Update Metrics HTML
      const metricsGrid = document.getElementById('report-metrics-grid');
      metricsGrid.innerHTML = `
        <div class="glass-panel" style="padding:1.25rem;">
          <h4 style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Net Sales Revenue</h4>
          <div style="font-size:1.75rem; font-weight:800; color:var(--primary); margin-top:0.35rem;">${formatCurrency(netRevenue)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">(Excludes rejected orders)</div>
        </div>

        <div class="glass-panel" style="padding:1.25rem;">
          <h4 style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Valid Orders Count</h4>
          <div style="font-size:1.75rem; font-weight:800; color:var(--accent); margin-top:0.35rem;">${validOrders.length} Orders</div>
          <div style="font-size:0.75rem; color:#ef4444; margin-top:0.2rem;">${rejectedOrders.length} rejected</div>
        </div>

        <div class="glass-panel" style="padding:1.25rem;">
          <h4 style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Delivery Fees Collected</h4>
          <div style="font-size:1.75rem; font-weight:800; color:#2563eb; margin-top:0.35rem;">${formatCurrency(totalDeliveryFees)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Doorstep delivery revenue</div>
        </div>

        <div class="glass-panel" style="padding:1.25rem;">
          <h4 style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Avg Valid Order Value</h4>
          <div style="font-size:1.75rem; font-weight:800; color:var(--success); margin-top:0.35rem;">${formatCurrency(avgOrderValue)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Per customer order</div>
        </div>

        <div class="glass-panel" style="padding:1.25rem;">
          <h4 style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Total Pages Printed</h4>
          <div style="font-size:1.75rem; font-weight:800; color:#7c3aed; margin-top:0.35rem;">${totalPagesPrinted} Pages</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Paper volume printed</div>
        </div>

        <div class="glass-panel" style="padding:1.25rem;">
          <h4 style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Rejected / Deducted</h4>
          <div style="font-size:1.75rem; font-weight:800; color:#ef4444; margin-top:0.35rem;">-${formatCurrency(rejectedAmount)}</div>
          <div style="font-size:0.75rem; color:#ef4444; margin-top:0.2rem;">${rejectedOrders.length} order(s) deducted</div>
        </div>
      `;

      // Update Sales Ledger Table Rows
      const tbody = document.getElementById('report-ledger-body');
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center text-muted" style="padding:3rem;">
              🔍 No sales transactions found matching selected period and filters.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = filtered.map(o => {
          const filesList = (o.files && o.files.length > 0) ? o.files : (o.file ? [o.file] : []);
          const totalPgs = filesList.reduce((acc, f) => acc + (f.pages || 1) * ((f.options || o.options)?.copies || 1), 0);

          return `
            <tr>
              <td style="font-size:0.8rem;">${formatDate(o.createdAt)}<br><span style="color:var(--text-muted);">${formatTime(o.createdAt)}</span></td>
              <td><b>${o.id}</b></td>
              <td>
                <b>${o.customerName || 'Customer'}</b><br>
                <span style="font-size:0.75rem; color:var(--text-muted);">${o.customerPhone || 'N/A'}</span>
              </td>
              <td style="font-size:0.8rem;">
                ${o.pricing?.deliveryZone ? `🚚 ${o.pricing.deliveryZone}` : '🏪 Pickup'}
              </td>
              <td style="font-size:0.8rem;">
                <b>${filesList.length} file(s)</b> • ${totalPgs} pgs
              </td>
              <td>${formatCurrency(o.pricing?.deliveryFee || 0)}</td>
              <td><b style="color:${o.status === 'Rejected' ? '#ef4444' : 'var(--primary)'};">${formatCurrency(o.pricing?.total)}</b></td>
              <td><code>${o.payment?.utr || 'N/A'}</code></td>
              <td>${getStatusBadgeHTML(o.status)}</td>
            </tr>
          `;
        }).join('');
      }

      // Update Table Footer Totals
      const tfoot = document.getElementById('report-ledger-foot');
      tfoot.innerHTML = `
        <tr>
          <td colspan="5">Summary Total (${filtered.length} Filtered Transactions)</td>
          <td><b>${formatCurrency(filtered.reduce((sum, o) => sum + (o.status !== 'Rejected' ? (o.pricing?.deliveryFee || 0) : 0), 0))}</b></td>
          <td style="color:var(--primary); font-size:1.05rem;"><b>${formatCurrency(netRevenue)}</b></td>
          <td colspan="2">Net Gain (Excludes Rejected)</td>
        </tr>
      `;
    }

    // Initial render
    applyReportFilters();

    // Export Full Sales Ledger to CSV
    document.getElementById('btn-export-sales-csv').onclick = () => {
      const exportRows = orders.map(o => {
        const filesList = (o.files && o.files.length > 0) ? o.files : (o.file ? [o.file] : []);
        return {
          OrderID: o.id,
          Date: formatDate(o.createdAt),
          Time: formatTime(o.createdAt),
          CustomerName: o.customerName || 'N/A',
          Phone: o.customerPhone || 'N/A',
          DeliveryZone: o.pricing?.deliveryZone || 'Store Pickup',
          Address: o.customerAddress || 'Self Pickup',
          TotalFiles: filesList.length,
          PrintCost: (o.pricing?.paperCost || 0) + (o.pricing?.colorCost || 0),
          BindingCost: o.pricing?.bindingCost || 0,
          DeliveryFee: o.pricing?.deliveryFee || 0,
          TotalAmount: o.pricing?.total || 0,
          PaymentUTR: o.payment?.utr || 'N/A',
          OrderStatus: o.status
        };
      });
      exportToCSV('Team7_Full_Sales_Ledger.csv', exportRows);
      NotificationService.showToast('Full Sales Ledger exported to Excel CSV!', 'success');
    };

    // Print Report Summary
    document.getElementById('btn-print-report-summary').onclick = () => {
      window.print();
    };
  },

  // --- FIREBASE DIAGNOSTIC ---
  async renderFirebaseDiagnostic() {
    const run = async () => {
      const results = [];
      const started = Date.now();
      const add = (name, status, detail, ms) => results.push({ name, status, detail, ms });

      // 1. SDK / app initialization
      try {
        await initFirebase();
        const services = getServices();
        if (!services.db && !services.auth && !services.storage) {
          add('Firebase SDK / App', 'FAIL', 'Firebase initialized without service handles. Check SDK loading, browser extensions, network and Firebase config.', Date.now()-started);
        } else {
          add('Firebase SDK / App', 'PASS', `Project: ${firebaseConfig.projectId}`, Date.now()-started);
        }

        // Firestore read
        const t=Date.now();
        if (!services.db) {
          add('Firestore', 'FAIL', 'Firestore handle is unavailable because Firebase initialization failed.', Date.now()-t);
        } else {
          try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
            const snap = await getDoc(doc(services.db, 'settings', 'general'));
            add('Firestore', 'PASS', snap.exists() ? 'settings/general is readable.' : 'Connected, but settings/general does not exist.', Date.now()-t);
          } catch(e) {
            add('Firestore', 'FAIL', `${e.code || 'error'}: ${e.message || e}`, Date.now()-t);
          }
        }

        // Realtime Database read
        const t2=Date.now();
        if (!services.firebaseApp) {
          add('Realtime Database', 'FAIL', 'Firebase app handle unavailable.', Date.now()-t2);
        } else {
          try {
            const { getDatabase, ref, get } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
            const rtdb = getDatabase(services.firebaseApp);
            await get(ref(rtdb, '__t7_diagnostic__'));
            add('Realtime Database', 'PASS', 'Read test completed.', Date.now()-t2);
          } catch(e) {
            add('Realtime Database', 'FAIL', `${e.code || 'error'}: ${e.message || e}`, Date.now()-t2);
          }
        }

        // Storage read/list test
        const t3=Date.now();
        if (!services.storage) {
          add('Firebase Storage', 'FAIL', 'Storage handle is unavailable because Firebase initialization failed.', Date.now()-t3);
        } else {
          try {
            const { ref, listAll } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');
            await listAll(ref(services.storage, 'uploads'));
            add('Firebase Storage', 'PASS', 'Storage bucket is reachable and uploads/ can be listed.', Date.now()-t3);
          } catch(e) {
            // list permission failure is still useful diagnostic information.
            add('Firebase Storage', 'FAIL', `${e.code || 'error'}: ${e.message || e}`, Date.now()-t3);
          }
        }

        // Authentication state
        const t4=Date.now();
        try {
          const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
          const auth = getAuth(services.firebaseApp);
          add('Firebase Authentication', 'PASS', auth.currentUser ? `Signed in as ${auth.currentUser.email || auth.currentUser.uid}` : 'Firebase Auth is reachable; no Firebase user is signed in.', Date.now()-t4);
        } catch(e) {
          add('Firebase Authentication', 'FAIL', `${e.code || 'error'}: ${e.message || e}`, Date.now()-t4);
        }
      } catch(e) {
        add('Firebase SDK / App', 'FAIL', `${e.code || 'error'}: ${e.message || e}`, Date.now()-started);
      }

      return results;
    };

    const render = (results = null) => {
      const escD = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const passed = results ? results.filter(r=>r.status==='PASS').length : 0;
      const failed = results ? results.filter(r=>r.status==='FAIL').length : 0;
      return `
        <div class="table-card">
          <div class="table-toolbar" style="align-items:flex-start;gap:1rem;">
            <div>
              <h3>🔥 Firebase Diagnostic</h3>
              <p class="text-muted">Tests the actual Firebase connection used by T7-PrintHub. It does not write test data.</p>
            </div>
            <button class="btn btn-primary" id="run-firebase-diagnostic">🔄 Run Diagnostics</button>
          </div>
          <div style="padding:1.25rem;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1rem;">
              <div class="metric-card"><b>${results ? passed : '—'}</b><span>Passed</span></div>
              <div class="metric-card"><b>${results ? failed : '—'}</b><span>Failed</span></div>
              <div class="metric-card"><b>${escD(firebaseConfig.projectId)}</b><span>Firebase Project</span></div>
            </div>
            ${results ? `
            <div style="display:grid;gap:.65rem;">
              ${results.map(r=>`
                <div style="display:grid;grid-template-columns:220px 90px 1fr 70px;gap:.75rem;align-items:center;padding:1rem;border:1px solid var(--border-color);border-radius:10px;">
                  <strong>${escD(r.name)}</strong>
                  <span class="badge ${r.status==='PASS'?'badge-success':'badge-danger'}">${r.status}</span>
                  <span style="word-break:break-word;">${escD(r.detail)}</span>
                  <small class="text-muted">${r.ms} ms</small>
                </div>`).join('')}
            </div>
            <div style="margin-top:1rem;padding:1rem;border-radius:10px;background:var(--bg-body);">
              <b>What to send me:</b>
              <div class="text-muted" style="margin-top:.35rem;">If anything says FAIL, send me a screenshot of this page. The exact error code/message will identify the problem.</div>
            </div>` : `
              <div style="padding:3rem;text-align:center;border:1px dashed var(--border-color);border-radius:12px;">
                <div style="font-size:3rem;">🔥</div>
                <h3>Ready to test Firebase</h3>
                <p class="text-muted">Click Run Diagnostics.</p>
              </div>`}
          </div>
        </div>`;
    };

    await this.renderAdminLayout('firebase-diagnostic', render());
    const btn=document.getElementById('run-firebase-diagnostic');
    if(btn) btn.onclick=async()=>{
      btn.disabled=true; btn.textContent='⏳ Testing...';
      const results=await run();
      await this.renderAdminLayout('firebase-diagnostic', render(results));
      document.getElementById('run-firebase-diagnostic')?.focus();
    };
  },

  // --- SHOP SETTINGS ---
  async renderSettings() {
    const settings = await DBService.getSettings();

    const html = `
      <div class="table-card">
        <div class="table-toolbar">
          <h3>Shop & UPI Payment Settings</h3>
          <button class="btn btn-success" id="btn-save-settings-form">💾 Save Shop Settings</button>
        </div>

        <div style="padding:1.5rem;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div class="form-group">
              <label class="form-label">Shop / Business Name</label>
              <input type="text" class="form-control" id="st-name" value="${settings.shopName}">
            </div>

            <div class="form-group">
              <label class="form-label">Business UPI ID (For Payment QR)</label>
              <input type="text" class="form-control" id="st-upi" value="${settings.upiId}">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
            <div class="form-group">
              <label class="form-label">Merchant Name (UPI Display Name)</label>
              <input type="text" class="form-control" id="st-merchant" value="${settings.merchantName}">
            </div>

            <div class="form-group">
              <label class="form-label">GST Number (GSTIN)</label>
              <input type="text" class="form-control" id="st-gst" value="${settings.gstNumber}">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.25rem;">
            <div class="form-group">
              <label class="form-label" style="font-weight:700;">Support Call Phone</label>
              <input type="text" class="form-control" id="st-phone" value="${settings.phone || ''}">
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight:700; color:#059669;">💬 WhatsApp Business Phone *</label>
              <input type="text" class="form-control" id="st-whatsapp" value="${settings.whatsappNumber || settings.phone || ''}" placeholder="E.g., 919789123456 or +91 97891 23456" style="border-color:rgba(16,185,129,0.5);">
              <span style="font-size:0.72rem; color:var(--text-muted); margin-top:0.25rem; display:block;">Powers floating WhatsApp button, contact page & order chat links.</span>
            </div>

            <div class="form-group">
              <label class="form-label" style="font-weight:700;">Contact Email</label>
              <input type="email" class="form-control" id="st-email" value="${settings.email || ''}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Shop Address</label>
            <textarea class="form-control" id="st-address">${settings.address || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Google Map Embed URL</label>
            <input type="text" class="form-control" id="st-map" value="${settings.googleMapUrl || ''}">
          </div>

          <div style="margin-top:1.5rem;padding:1.25rem;border:1px solid var(--border-color);border-radius:14px;background:var(--bg-body);">
            <h3 style="margin:0 0 .35rem;">🚚 Home Delivery KG Pricing</h3>
            <p class="text-muted" style="font-size:.8rem;margin-bottom:1rem;">Set the weight-based customer delivery charge. Store Pickup is always free.</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
              <div class="form-group"><label class="form-label">Courier</label><input class="form-control" id="st-courier-name" value="${settings.courierPricing?.courierName || 'ST Courier'}"></div>
              <div class="form-group"><label class="form-label">Base Weight (KG)</label><input type="number" step="0.01" min="0.01" class="form-control" id="st-courier-base-kg" value="${Number(settings.courierPricing?.baseWeightKg ?? 1)}"></div>
              <div class="form-group"><label class="form-label">Base Cost (₹)</label><input type="number" step="0.01" min="0" class="form-control" id="st-courier-base-cost" value="${Number(settings.courierPricing?.baseCost ?? 60)}"></div>
              <div class="form-group"><label class="form-label">Additional Slab (KG)</label><input type="number" step="0.01" min="0.01" class="form-control" id="st-courier-add-kg" value="${Number(settings.courierPricing?.additionalWeightKg ?? .5)}"></div>
              <div class="form-group"><label class="form-label">Additional Slab Cost (₹)</label><input type="number" step="0.01" min="0" class="form-control" id="st-courier-add-cost" value="${Number(settings.courierPricing?.additionalCost ?? 40)}"></div>
              <div class="form-group"><label class="form-label">Default Packing Weight (g)</label><input type="number" step="1" min="0" class="form-control" id="st-courier-pack-g" value="${Number(settings.courierPricing?.packagingWeightGrams ?? 50)}"></div>
              <div class="form-group"><label class="form-label">Binding Weight (g)</label><input type="number" step="1" min="0" class="form-control" id="st-courier-bind-g" value="${Number(settings.courierPricing?.bindingWeightGrams ?? 30)}"></div>
              <div style="padding-top:1.8rem;font-weight:700;color:#059669;">✓ Weight-based delivery charges enabled</div>
            </div>
          </div>
        </div>
      </div>
    `;

    await this.renderAdminLayout('settings', html);

    document.getElementById('btn-save-settings-form').onclick = async () => {
      const btn = document.getElementById('btn-save-settings-form');
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Saving...';
      btn.disabled = true;

      const updatedSettings = {
        ...settings,
        shopName: document.getElementById('st-name').value.trim(),
        upiId: document.getElementById('st-upi').value.trim(),
        merchantName: document.getElementById('st-merchant').value.trim(),
        gstNumber: document.getElementById('st-gst').value.trim(),
        phone: document.getElementById('st-phone').value.trim(),
        whatsappNumber: document.getElementById('st-whatsapp').value.trim(),
        email: document.getElementById('st-email').value.trim(),
        address: document.getElementById('st-address').value.trim(),
        googleMapUrl: document.getElementById('st-map').value.trim(),
        courierPricing: {
          courierName: document.getElementById('st-courier-name').value.trim() || 'ST Courier',
          baseWeightKg: Number(document.getElementById('st-courier-base-kg').value) || 1,
          baseCost: Number(document.getElementById('st-courier-base-cost').value) || 60,
          additionalWeightKg: Number(document.getElementById('st-courier-add-kg').value) || 0.5,
          additionalCost: Number(document.getElementById('st-courier-add-cost').value) || 40,
          packagingWeightGrams: Number(document.getElementById('st-courier-pack-g').value) || 0,
          bindingWeightGrams: Number(document.getElementById('st-courier-bind-g').value) || 0,
          freeDelivery: false
        },
      };

      try {
        await DBService.saveSettings(updatedSettings);
        if (window.refreshShopSettingsUI) window.refreshShopSettingsUI(updatedSettings);
        NotificationService.showToast('✅ Shop Settings saved successfully! All pages updated.', 'success');
      } catch (err) {
        console.error('[SHOP SETTINGS] Admin save failed:', err);
        NotificationService.showToast('❌ Failed to save settings. Check your internet connection.', 'error');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    };
  },

  // --- ADMIN ABOUT PAGE EDITOR ---
  async renderAboutSettings() {
    const escapeHtml = (val) => String(val ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    let savedData = await DBService.getAboutPage();
    let workingData = JSON.parse(JSON.stringify(savedData));
    let pendingCreatorFile = null;

    const renderUI = async () => {
      const c = workingData.creator || {};
      const defaultAvatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%233b82f6"><circle cx="50" cy="35" r="22"/><path d="M15,88 C15,65 30,55 50,55 C70,55 85,65 85,88 Z"/></svg>`;
      const previewImgUrl = c.imageUrl && c.imageUrl.trim() ? c.imageUrl : defaultAvatarSvg;

      const html = `
        <div class="table-card" style="padding:0;">
          <div class="table-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding:1.25rem 1.5rem; background:var(--bg-card); border-bottom:1px solid var(--border-color);">
            <div>
              <h3 style="margin:0; font-size:1.3rem;">ℹ️ About Page & Creator Profile Editor</h3>
              <p class="text-muted" style="margin:0.25rem 0 0; font-size:0.83rem;">Manage public About page content, creator profile (Vignesh), services showcase, steps, and contact info.</p>
            </div>
            <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" id="btn-preview-about">👁️ Live Preview</button>
              <button class="btn btn-outline btn-sm" id="btn-reset-about">🔄 Reset</button>
              <button class="btn btn-success btn-sm" id="btn-save-about">💾 Save Changes</button>
            </div>
          </div>

          <div style="padding:1.5rem; display:flex; flex-direction:column; gap:2rem;">

            <!-- 1. CREATOR EDITOR (VIGNESH PROFILE) -->
            <div style="background:var(--bg-card); border:1.5px solid var(--primary-light); border-radius:14px; padding:1.5rem; box-shadow:var(--shadow-sm);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:0.75rem;">
                <div style="display:flex; align-items:center; gap:0.6rem;">
                  <span style="font-size:1.5rem;">👨‍💻</span>
                  <div>
                    <h4 style="margin:0; font-size:1.1rem; color:var(--primary);">Creator Profile Section ("This App Was Created by Vignesh")</h4>
                    <span class="text-muted" style="font-size:0.78rem;">Fully customizable creator spotlight displayed on the public About page.</span>
                  </div>
                </div>
                <label style="display:inline-flex; align-items:center; gap:0.5rem; font-weight:700; cursor:pointer; font-size:0.9rem;">
                  <input type="checkbox" id="abt-creator-enabled" ${c.enabled !== false ? 'checked' : ''}>
                  Show Creator Section on About Page
                </label>
              </div>

              <!-- Creator Photo Uploader -->
              <div style="display:grid; grid-template-columns:160px 1fr; gap:1.5rem; align-items:center; background:var(--primary-light); padding:1.25rem; border-radius:12px; margin-bottom:1.25rem; border:1px solid var(--border-color);">
                <div style="text-align:center;">
                  <div style="width:130px; height:130px; border-radius:50%; overflow:hidden; border:4px solid var(--primary); background:white; margin:0 auto; display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-md);">
                    <img id="abt-creator-img-preview" src="${previewImgUrl}" alt="Creator Photo" style="width:100%; height:100%; object-fit:cover; object-position:center;" onerror="this.onerror=null;this.src='${defaultAvatarSvg}';" />
                  </div>
                  <span id="abt-creator-upload-status" style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem; font-weight:600; display:block;">
                    ${c.imageUrl ? '✅ Saved in Firebase' : 'Default Avatar'}
                  </span>
                </div>

                <div>
                  <h5 style="margin:0 0 0.35rem; font-size:0.95rem; font-weight:700;">Creator Image Component</h5>
                  <p class="text-muted" style="font-size:0.8rem; margin:0 0 0.85rem;">
                    Upload JPG, JPEG, PNG, or WEBP photo (max 10MB). Recommended: 500×500 or 800×800 square photo.
                  </p>
                  <div style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap;">
                    <input type="file" id="abt-creator-file-input" accept="image/jpeg,image/png,image/webp,image/jpg" style="display:none;">
                    <button type="button" class="btn btn-sm btn-primary" id="btn-trigger-creator-photo">📁 Choose Image</button>
                    <button type="button" class="btn btn-sm btn-success" id="abt-creator-upload-btn">⚡ Upload / Save Image</button>
                    <button type="button" class="btn btn-sm btn-danger" id="abt-creator-img-remove">🗑️ Remove Image</button>
                  </div>
                </div>
              </div>

              <!-- Creator Text Details -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-weight:700;">Creator Name *</label>
                  <input type="text" class="form-control" id="abt-creator-name" value="${escapeHtml(c.name || 'Vignesh')}">
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label" style="font-weight:700;">Creator Heading / Title *</label>
                  <input type="text" class="form-control" id="abt-creator-heading" value="${escapeHtml(c.heading || 'This App Was Created by Vignesh')}">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Role / Tagline</label>
                  <input type="text" class="form-control" id="abt-creator-role" value="${escapeHtml(c.role || 'Developer & Creator')}">
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Creator Contact Phone</label>
                  <input type="text" class="form-control" id="abt-creator-phone" value="${escapeHtml(c.phone || '9360039283')}">
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Call Button Label</label>
                  <input type="text" class="form-control" id="abt-creator-call-text" value="${escapeHtml(c.callBtnText || `📞 Contact ${c.name || 'Vignesh'} — ${c.phone || '9360039283'}`)}">
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">WhatsApp Button Label</label>
                  <input type="text" class="form-control" id="abt-creator-wa-text" value="${escapeHtml(c.whatsappBtnText || '💬 WhatsApp Vignesh')}">
                </div>
              </div>

              <div class="form-group" style="margin:0;">
                <label class="form-label">Creator Biography / Description</label>
                <textarea class="form-control" id="abt-creator-desc" rows="3">${escapeHtml(c.description || '')}</textarea>
              </div>
            </div>

            <!-- 2. GENERAL PAGE CONTENT -->
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:1.5rem;">
              <h4 style="margin:0 0 1rem; font-size:1.1rem;">📝 Page Title & Main Description</h4>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">About Page Badge / Title</label>
                  <input type="text" class="form-control" id="abt-title" value="${escapeHtml(workingData.title || 'T7 Print Hub')}">
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Subheading</label>
                  <input type="text" class="form-control" id="abt-subtitle" value="${escapeHtml(workingData.subtitle || '')}">
                </div>
              </div>
              <div class="form-group" style="margin:0;">
                <label class="form-label">Main Application Description</label>
                <textarea class="form-control" id="abt-desc" rows="3">${escapeHtml(workingData.description || '')}</textarea>
              </div>
            </div>

            <!-- 3. SERVICES SHOWCASE MANAGER -->
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:1.5rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h4 style="margin:0; font-size:1.1rem;">🛠️ About Page Services Showcase (${(workingData.services || []).length} items)</h4>
                <button type="button" class="btn btn-sm btn-primary" id="abt-add-service-btn">➕ Add Service</button>
              </div>
              <div id="abt-services-list" style="display:flex; flex-direction:column; gap:0.75rem;">
                ${(workingData.services || []).map((srv, idx) => `
                  <div style="display:grid; grid-template-columns:36px 40px minmax(0,1fr) minmax(0,2fr) auto auto; gap:0.75rem; align-items:center; padding:0.75rem; background:var(--primary-light); border:1px solid var(--border-color); border-radius:10px;">
                    <span style="font-weight:800; color:var(--text-muted); text-align:center;">#${idx + 1}</span>
                    <input type="text" class="form-control form-control-sm srv-icon" data-idx="${idx}" value="${escapeHtml(srv.icon || '📄')}" style="text-align:center;">
                    <input type="text" class="form-control form-control-sm srv-title" data-idx="${idx}" value="${escapeHtml(srv.title || '')}" placeholder="Service Title">
                    <input type="text" class="form-control form-control-sm srv-desc" data-idx="${idx}" value="${escapeHtml(srv.description || '')}" placeholder="Short Description">
                    <label style="margin:0; font-size:0.78rem; font-weight:700; cursor:pointer;">
                      <input type="checkbox" class="srv-enabled" data-idx="${idx}" ${srv.enabled !== false ? 'checked' : ''}> Show
                    </label>
                    <div style="display:flex; gap:0.3rem;">
                      <button type="button" class="btn btn-sm btn-secondary srv-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                      <button type="button" class="btn btn-sm btn-secondary srv-down" data-idx="${idx}" ${idx === workingData.services.length - 1 ? 'disabled' : ''}>▼</button>
                      <button type="button" class="btn btn-sm btn-danger srv-del" data-idx="${idx}">✕</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- 4. HOW IT WORKS STEPS MANAGER -->
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:1.5rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h4 style="margin:0; font-size:1.1rem;">📌 How It Works Steps (${(workingData.steps || []).length} steps)</h4>
                <button type="button" class="btn btn-sm btn-primary" id="abt-add-step-btn">➕ Add Step</button>
              </div>
              <div id="abt-steps-list" style="display:flex; flex-direction:column; gap:0.75rem;">
                ${(workingData.steps || []).map((step, idx) => `
                  <div style="display:grid; grid-template-columns:50px minmax(0,1fr) minmax(0,2fr) auto auto; gap:0.75rem; align-items:center; padding:0.75rem; background:var(--primary-light); border:1px solid var(--border-color); border-radius:10px;">
                    <span style="font-weight:800; color:var(--primary); text-align:center;">Step ${idx + 1}</span>
                    <input type="text" class="form-control form-control-sm step-title" data-idx="${idx}" value="${escapeHtml(step.title || '')}" placeholder="Step Title">
                    <input type="text" class="form-control form-control-sm step-desc" data-idx="${idx}" value="${escapeHtml(step.description || '')}" placeholder="Step Description">
                    <label style="margin:0; font-size:0.78rem; font-weight:700; cursor:pointer;">
                      <input type="checkbox" class="step-enabled" data-idx="${idx}" ${step.enabled !== false ? 'checked' : ''}> Show
                    </label>
                    <div style="display:flex; gap:0.3rem;">
                      <button type="button" class="btn btn-sm btn-secondary step-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                      <button type="button" class="btn btn-sm btn-secondary step-down" data-idx="${idx}" ${idx === workingData.steps.length - 1 ? 'disabled' : ''}>▼</button>
                      <button type="button" class="btn btn-sm btn-danger step-del" data-idx="${idx}">✕</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- 5. CONTACT & SOCIAL LINKS -->
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:14px; padding:1.5rem;">
              <h4 style="margin:0 0 1rem; font-size:1.1rem;">📞 Contact & Social Media Links</h4>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1.25rem; margin-bottom:1.25rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Phone</label>
                  <input type="text" class="form-control" id="abt-cnt-phone" value="${escapeHtml(workingData.contact?.phone || '')}">
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">WhatsApp</label>
                  <input type="text" class="form-control" id="abt-cnt-wa" value="${escapeHtml(workingData.contact?.whatsapp || '')}">
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" id="abt-cnt-email" value="${escapeHtml(workingData.contact?.email || '')}">
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Facebook URL</label>
                  <input type="url" class="form-control" id="abt-soc-fb" value="${escapeHtml(workingData.socialLinks?.facebook || '')}">
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">Instagram URL</label>
                  <input type="url" class="form-control" id="abt-soc-ig" value="${escapeHtml(workingData.socialLinks?.instagram || '')}">
                </div>
              </div>
            </div>

          </div>
        </div>
      `;

      await this.renderAdminLayout('about', html);
      attachEvents();
    };

    const readFormValues = () => {
      const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

      workingData.title = getVal('abt-title');
      workingData.subtitle = getVal('abt-subtitle');
      workingData.description = getVal('abt-desc');

      workingData.creator = {
        ...(workingData.creator || {}),
        enabled: !!document.getElementById('abt-creator-enabled')?.checked,
        name: getVal('abt-creator-name'),
        heading: getVal('abt-creator-heading'),
        role: getVal('abt-creator-role'),
        phone: getVal('abt-creator-phone'),
        callBtnText: getVal('abt-creator-call-text'),
        whatsappBtnText: getVal('abt-creator-wa-text'),
        description: getVal('abt-creator-desc')
      };

      document.querySelectorAll('.srv-title').forEach(input => {
        const idx = Number(input.dataset.idx);
        if (workingData.services[idx]) {
          workingData.services[idx].title = input.value.trim();
          workingData.services[idx].icon = document.querySelector(`.srv-icon[data-idx="${idx}"]`)?.value?.trim() || '📄';
          workingData.services[idx].description = document.querySelector(`.srv-desc[data-idx="${idx}"]`)?.value?.trim() || '';
          workingData.services[idx].enabled = !!document.querySelector(`.srv-enabled[data-idx="${idx}"]`)?.checked;
        }
      });

      document.querySelectorAll('.step-title').forEach(input => {
        const idx = Number(input.dataset.idx);
        if (workingData.steps[idx]) {
          workingData.steps[idx].title = input.value.trim();
          workingData.steps[idx].description = document.querySelector(`.step-desc[data-idx="${idx}"]`)?.value?.trim() || '';
          workingData.steps[idx].enabled = !!document.querySelector(`.step-enabled[data-idx="${idx}"]`)?.checked;
        }
      });

      workingData.contact = {
        ...(workingData.contact || {}),
        phone: getVal('abt-cnt-phone'),
        whatsapp: getVal('abt-cnt-wa'),
        email: getVal('abt-cnt-email')
      };

      workingData.socialLinks = {
        ...(workingData.socialLinks || {}),
        facebook: getVal('abt-soc-fb'),
        instagram: getVal('abt-soc-ig')
      };
    };

    const executeCreatorImageUpload = async () => {
      if (!pendingCreatorFile) return null;
      const statusEl = document.getElementById('abt-creator-upload-status');
      if (statusEl) statusEl.textContent = '⏳ Uploading to Firebase Storage...';

      try {
        const uploadResult = await StorageService.uploadCreatorImage(pendingCreatorFile);
        if (!uploadResult || !uploadResult.downloadURL) {
          throw new Error('Firebase Storage did not return a valid download URL.');
        }

        workingData.creator.imageUrl = uploadResult.downloadURL;
        workingData.creator.imageStoragePath = uploadResult.storagePath || '';
        pendingCreatorFile = null;

        const imgEl = document.getElementById('abt-creator-img-preview');
        if (imgEl) imgEl.src = uploadResult.downloadURL + (uploadResult.downloadURL.includes('?') ? '&' : '?') + 't=' + Date.now();
        if (statusEl) statusEl.textContent = '✅ Image uploaded successfully!';

        NotificationService.showToast('Image uploaded successfully', 'success');
        return uploadResult;
      } catch (uploadErr) {
        console.error('[CREATOR IMAGE] Upload error:', uploadErr);
        if (statusEl) statusEl.textContent = '❌ Upload failed!';
        NotificationService.showToast(`Creator image upload failed: ${uploadErr.message || 'Storage error'}`, 'error');
        throw uploadErr;
      }
    };

    const attachEvents = () => {
      document.getElementById('btn-trigger-creator-photo')?.addEventListener('click', () => {
        document.getElementById('abt-creator-file-input')?.click();
      });

      document.getElementById('abt-creator-file-input')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const type = String(file.type || '').toLowerCase();
        if (!type.startsWith('image/') || !/\.(jpg|jpeg|png|webp)$/i.test(file.name || '')) {
          NotificationService.showToast('Invalid file: Image file must be JPG, JPEG, PNG, or WEBP.', 'error');
          e.target.value = '';
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          NotificationService.showToast('Invalid file: Image file size must be 10MB or smaller.', 'error');
          e.target.value = '';
          return;
        }

        try {
          const previewUrl = await StorageService.readFileAsDataURL(file);
          const imgEl = document.getElementById('abt-creator-img-preview');
          const statusEl = document.getElementById('abt-creator-upload-status');
          if (imgEl) imgEl.src = previewUrl;
          if (statusEl) statusEl.textContent = `📁 Ready: ${file.name} (${StorageService.formatBytes(file.size)})`;
          pendingCreatorFile = file;
          NotificationService.showToast('Image selected! Click "Upload / Save Image" to upload to Firebase.', 'info');
        } catch (err) {
          console.error('[ABOUT] Local preview failed:', err);
          NotificationService.showToast('Failed to preview image file.', 'error');
        }
      });

      document.getElementById('abt-creator-upload-btn')?.addEventListener('click', async () => {
        readFormValues();
        const btn = document.getElementById('abt-creator-upload-btn');
        if (!pendingCreatorFile) {
          if (workingData.creator.imageUrl) {
            NotificationService.showToast('Creator image is already uploaded to Firebase Storage.', 'info');
          } else {
            NotificationService.showToast('Please choose an image file first.', 'warning');
          }
          return;
        }

        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Uploading...';

        try {
          await executeCreatorImageUpload();
          savedData = await DBService.saveAboutPage(workingData);
          await renderUI();
        } catch (err) {
          // Toast handled in executeCreatorImageUpload
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        }
      });

      document.getElementById('abt-creator-img-remove')?.addEventListener('click', async () => {
        if (!confirm("Remove creator image?")) return;
        readFormValues();

        const statusEl = document.getElementById('abt-creator-upload-status');
        if (statusEl) statusEl.textContent = '⏳ Deleting image...';

        if (workingData.creator.imageStoragePath) {
          try {
            await StorageService.deleteFileByPath(workingData.creator.imageStoragePath);
          } catch (e) {
            console.warn('[CREATOR IMAGE] Storage deletion warning:', e);
          }
        }

        pendingCreatorFile = null;
        workingData.creator.imageUrl = '';
        workingData.creator.imageStoragePath = '';

        try {
          savedData = await DBService.saveAboutPage(workingData);
          NotificationService.showToast('Creator image removed.', 'info');
          await renderUI();
        } catch (err) {
          console.error('[CREATOR IMAGE] Remove save error:', err);
          NotificationService.showToast('Failed to update Firestore after image removal.', 'error');
        }
      });

      document.getElementById('abt-add-service-btn')?.addEventListener('click', () => {
        readFormValues();
        workingData.services.push({
          id: 'srv-' + Date.now(),
          icon: '📄',
          title: 'New Printing Service',
          description: 'Service description details...',
          enabled: true,
          imageUrl: ''
        });
        renderUI();
      });

      document.querySelectorAll('.srv-del').forEach(btn => {
        btn.onclick = () => {
          readFormValues();
          const idx = Number(btn.dataset.idx);
          workingData.services.splice(idx, 1);
          renderUI();
        };
      });

      document.querySelectorAll('.srv-up').forEach(btn => {
        btn.onclick = () => {
          readFormValues();
          const idx = Number(btn.dataset.idx);
          if (idx > 0) {
            const temp = workingData.services[idx];
            workingData.services[idx] = workingData.services[idx - 1];
            workingData.services[idx - 1] = temp;
            renderUI();
          }
        };
      });

      document.querySelectorAll('.srv-down').forEach(btn => {
        btn.onclick = () => {
          readFormValues();
          const idx = Number(btn.dataset.idx);
          if (idx < workingData.services.length - 1) {
            const temp = workingData.services[idx];
            workingData.services[idx] = workingData.services[idx + 1];
            workingData.services[idx + 1] = temp;
            renderUI();
          }
        };
      });

      document.getElementById('abt-add-step-btn')?.addEventListener('click', () => {
        readFormValues();
        workingData.steps.push({
          number: workingData.steps.length + 1,
          title: 'New Step',
          description: 'Step description details...',
          enabled: true
        });
        renderUI();
      });

      document.querySelectorAll('.step-del').forEach(btn => {
        btn.onclick = () => {
          readFormValues();
          const idx = Number(btn.dataset.idx);
          workingData.steps.splice(idx, 1);
          workingData.steps.forEach((s, i) => s.number = i + 1);
          renderUI();
        };
      });

      document.querySelectorAll('.step-up').forEach(btn => {
        btn.onclick = () => {
          readFormValues();
          const idx = Number(btn.dataset.idx);
          if (idx > 0) {
            const temp = workingData.steps[idx];
            workingData.steps[idx] = workingData.steps[idx - 1];
            workingData.steps[idx - 1] = temp;
            workingData.steps.forEach((s, i) => s.number = i + 1);
            renderUI();
          }
        };
      });

      document.querySelectorAll('.step-down').forEach(btn => {
        btn.onclick = () => {
          readFormValues();
          const idx = Number(btn.dataset.idx);
          if (idx < workingData.steps.length - 1) {
            const temp = workingData.steps[idx];
            workingData.steps[idx] = workingData.steps[idx + 1];
            workingData.steps[idx + 1] = temp;
            workingData.steps.forEach((s, i) => s.number = i + 1);
            renderUI();
          }
        };
      });

      document.getElementById('btn-reset-about')?.addEventListener('click', async () => {
        workingData = JSON.parse(JSON.stringify(savedData));
        pendingCreatorFile = null;
        await renderUI();
        NotificationService.showToast('Reset to saved About settings.', 'info');
      });

      document.getElementById('btn-preview-about')?.addEventListener('click', () => {
        readFormValues();
        const modal = ModalComponent || window.ModalComponent;
        if (modal?.show && PublicViews?.renderAboutHTML) {
          modal.show({
            title: '👁️ Live Customer About Page Preview',
            bodyHTML: PublicViews.renderAboutHTML(workingData),
            width: '960px'
          });
        }
      });

      document.getElementById('btn-save-about')?.addEventListener('click', async () => {
        readFormValues();
        const btn = document.getElementById('btn-save-about');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Saving...';

        try {
          if (pendingCreatorFile) {
            await executeCreatorImageUpload();
          }

          savedData = await DBService.saveAboutPage(workingData);
          pendingCreatorFile = null;
          NotificationService.showToast('About page updated successfully', 'success');
          await renderUI();
        } catch (err) {
          console.error('[ABOUT] Save failed:', err);
          NotificationService.showToast('Failed to update About page: ' + (err?.message || 'Firebase error'), 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
          }
        }
      });
    };

    await renderUI();
  },

  // --- CATALOG MANAGER: PRINTING SERVICES + STATIONERY PRODUCTS ---
  async renderCatalog() {
    const catalog = await DBService.getServicesCatalog();
    const products = await DBService.getProductsCatalog();
    const shopSettings = DBService.getSettingsSync();
    const productCategories = Array.isArray(shopSettings.shopProductCategories) && shopSettings.shopProductCategories.length
      ? shopSettings.shopProductCategories
      : ['Pen', 'Pencil', 'Folder', 'Notebook', 'Accessory', 'Other'];

    const hashQuery = (window.location.hash.split('?')[1] || '');
    const activeTab = new URLSearchParams(hashQuery).get('tab') === 'stationery'
      ? 'stationery'
      : 'printing';

    const esc = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const serviceRows = catalog.length === 0 ? `
      <tr>
        <td colspan="8" class="text-center text-muted" style="padding:3rem;">
          No services created in catalog yet.
        </td>
      </tr>
    ` : catalog.map(s => `
      <tr>
        <td style="font-size:1.5rem;text-align:center;">${esc(s.icon || '📄')}</td>
        <td>
          <b>${esc(s.title || 'Untitled Service')}</b>
          <div style="font-size:.75rem;color:var(--text-muted);">ID: ${esc(s.id)}</div>
        </td>
        <td><span class="badge badge-waiting" style="font-size:.75rem;">${esc(s.category || 'General')}</span></td>
        <td><b style="color:var(--primary);">${esc(s.startingPrice || formatServicePrice(s))}</b></td>
        <td style="font-size:.825rem;color:var(--text-muted);max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(s.description || '')}">
          ${esc(s.description || '')}
        </td>
        <td>${s.popular ? '<span class="badge badge-approved">Popular</span>' : '<span class="badge" style="background:var(--border-color);color:var(--text-muted);">Standard</span>'}</td>
        <td>${s.status === 'Inactive'
          ? '<span class="badge badge-rejected">● Inactive</span>'
          : '<span class="badge badge-approved">● Active</span>'}</td>
        <td>
          <div style="display:flex;gap:.35rem;">
            <button class="btn btn-sm btn-outline" onclick="window.openCatalogModal('${esc(s.id)}')">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteCatalogItem('${esc(s.id)}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    const productRows = products.length === 0 ? `
      <tr>
        <td colspan="8" class="text-center text-muted" style="padding:3rem;">
          No products found.
        </td>
      </tr>
    ` : products.map(p => `
      <tr>
        <td style="text-align:center;">
          ${p.imageUrl
            ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name || 'Product')}" loading="lazy" style="width:58px;height:58px;object-fit:cover;border-radius:8px;border:1px solid var(--border-color);">`
            : `<span style="font-size:1.5rem;">${esc(p.icon || '📦')}</span>`}
        </td>
        <td>
          <b>${esc(p.name || 'Unnamed Product')}</b>
          <div style="font-size:.75rem;color:var(--text-muted);">ID: ${esc(p.id)}</div>
        </td>
        <td><span class="badge badge-waiting" style="font-size:.75rem;">${esc(p.category || 'Accessory')}</span></td>
        <td><b style="color:var(--primary);">${formatCurrency(Number(p.price) || 0)}</b></td>
        <td><b>${Number(p.weightGrams || 0)} g</b><div style="font-size:.7rem;color:var(--text-muted);">+ ${Number(p.packagingWeightGrams || 0)} g pack</div></td>
        <td style="font-size:.825rem;color:var(--text-muted);max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(p.description || '')}">
          ${esc(p.description || '')}
        </td>
        <td>${p.popular ? '<span class="badge badge-approved">Popular</span>' : '<span class="badge" style="background:var(--border-color);color:var(--text-muted);">Standard</span>'}</td>
        <td>${p.status === 'Inactive' || p.stockStatus === 'Out of Stock'
          ? `<span class="badge badge-rejected">● ${p.status === 'Inactive' ? 'Inactive' : 'Out of Stock'}</span>`
          : '<span class="badge badge-approved">● In Stock / Active</span>'}</td>
        <td>
          <div style="display:flex;gap:.35rem;flex-wrap:wrap;">
            <button class="btn btn-sm btn-outline" onclick="window.openProductModal('${esc(p.id)}')">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteProductItem('${esc(p.id)}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    const html = `
      <div class="table-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;padding:1.25rem;border-bottom:1px solid var(--border-color);">
          <div>
            <h3>Catalog & Products</h3>
            <p class="text-muted" style="font-size:.85rem;margin-top:.25rem;">
              Manage printing services and stationery/shop products displayed to customers.
            </p>
          </div>
          <a href="#services" class="btn btn-outline">👁️ View Customer Catalog ↗</a>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:1rem 1.25rem;border-bottom:1px solid var(--border-color);flex-wrap:wrap;">
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <button class="btn ${activeTab === 'printing' ? 'btn-primary' : 'btn-outline'}" onclick="window.switchCatalogTab('printing')">
              🖨️ Printing Services Catalog
            </button>
            <button class="btn ${activeTab === 'stationery' ? 'btn-primary' : 'btn-outline'}" onclick="window.switchCatalogTab('stationery')">
              ✏️ Stationery & Shop Products
            </button>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
            ${activeTab === 'stationery'
              ? '<button class="btn btn-success" onclick="window.openProductModal()">➕ Add Product</button>'
              : '<button class="btn btn-success" onclick="window.openCatalogModal()">➕ Add Service</button>'}
            <button class="btn btn-primary" onclick="window.openProductModal(null, true)">🛍️ Add T7 Shop Product</button>
            <button class="btn btn-primary" onclick="window.openCatalogModal(null, true)">🛍️ Add T7 Shop Service</button>
            <button class="btn btn-outline" onclick="window.openT7ProductCategories()">⚙️ Product Categories</button>
          </div>
        </div>

        <div style="padding:1rem 1.25rem;">
          <div class="table-responsive">
            ${activeTab === 'printing' ? `
              <table class="data-table" id="catalog-table">
                <thead>
                  <tr>
                    <th>Icon</th><th>Service Title</th><th>Category</th><th>Starting Rate</th>
                    <th>Description</th><th>Badge</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>${serviceRows}</tbody>
              </table>
            ` : `
              <table class="data-table" id="products-table">
                <thead>
                  <tr>
                    <th>Icon</th><th>Product</th><th>Category</th><th>Price</th><th>Weight</th>
                    <th>Description</th><th>Badge</th><th>Stock / Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>${productRows}</tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `;

    await this.renderAdminLayout('catalog', html);

    // Define handlers AFTER the page exists. Both tabs now use their own
    // correct renderer and never execute a product handler on service data.
    window.switchCatalogTab = (tab) => {
      window.location.hash = `#admin-catalog?tab=${tab === 'stationery' ? 'stationery' : 'printing'}`;
    };

    window.openT7ProductCategories = async () => {
      const settings = DBService.getSettingsSync();
      let categories = Array.isArray(settings.shopProductCategories) && settings.shopProductCategories.length
        ? [...settings.shopProductCategories]
        : ['Pen', 'Pencil', 'Folder', 'Notebook', 'Accessory', 'Other'];

      const escHtml = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

      const render = () => `
        <div style="padding:.25rem;">
          <div style="display:flex;gap:.5rem;margin-bottom:1rem;">
            <input class="form-control" id="new-t7-category" placeholder="Enter new product category" maxlength="60">
            <button class="btn btn-success" type="button" onclick="window.addT7ProductCategory()">➕ Add</button>
          </div>
          <div id="t7-category-list">
            ${categories.map((c,i) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.75rem;border:1px solid var(--border-color);border-radius:9px;margin-bottom:.5rem;">
                <span><b>${escHtml(c)}</b></span>
                <button class="btn btn-sm btn-danger" type="button" onclick="window.removeT7ProductCategory(${i})">🗑️ Delete</button>
              </div>`).join('')}
          </div>
          <small class="text-muted">Categories are saved in Firebase settings and will appear in the product editor.</small>
        </div>`;

      window._t7ProductCategories = categories;

      window.addT7ProductCategory = async () => {
        const input = document.getElementById('new-t7-category');
        const value = String(input?.value || '').trim();
        if (!value) return NotificationService.showToast('Enter a category name.', 'warning');
        const list = window._t7ProductCategories || [];
        if (list.some(c => c.toLowerCase() === value.toLowerCase())) {
          return NotificationService.showToast('That category already exists.', 'warning');
        }
        list.push(value);
        window._t7ProductCategories = list;
        await DBService.saveSettings({ shopProductCategories: list });
        NotificationService.showToast('Product category added.', 'success');
        await window.openT7ProductCategories();
      };

      window.removeT7ProductCategory = async (index) => {
        const list = [...(window._t7ProductCategories || [])];
        if (!list[index]) return;
        const used = (await DBService.getProductsCatalog()).some(p => String(p.category || '').toLowerCase() === String(list[index]).toLowerCase());
        if (used && !confirm(`"${list[index]}" is used by a product. Delete the category anyway? Existing products will keep their current category.`)) return;
        list.splice(index, 1);
        window._t7ProductCategories = list;
        await DBService.saveSettings({ shopProductCategories: list });
        NotificationService.showToast('Product category deleted.', 'info');
        await window.openT7ProductCategories();
      };

      await ModalComponent.open({
        title: '⚙️ T7 Shop Product Categories',
        bodyHTML: render(),
        width: '600px'
      });
    };

    window.openProductModal = async (productId = null, shopMode = false) => {
      try {
        const allItems = await DBService.getProductsCatalog();
        const existing = productId ? allItems.find(item => item.id === productId) : null;

        const shopSettings = DBService.getSettingsSync();
        const categories = Array.isArray(shopSettings.shopProductCategories) && shopSettings.shopProductCategories.length
          ? shopSettings.shopProductCategories
          : ['Pen', 'Pencil', 'Folder', 'Notebook', 'Accessory', 'Other'];
        const modalHTML = `
          <form id="product-form" onsubmit="event.preventDefault(); window.saveProductForm('${esc(productId || '')}');">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">Product Name *</label>
                <input type="text" class="form-control" id="prod-name" value="${esc(existing?.name || '')}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Category *</label>
                <select class="form-select" id="prod-category">
                  ${categories.map(c => `<option value="${esc(c)}" ${existing?.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">Price (₹) *</label>
                <input type="number" class="form-control" id="prod-price" value="${Number(existing?.price) || 0}" min="0" step="0.01" required>
              </div>
              <div class="form-group">
                <label class="form-label">Product Weight (g) *</label>
                <input type="number" class="form-control" id="prod-weight" value="${Number(existing?.weightGrams) || 0}" min="0" step="0.1" required>
              </div>
              <div class="form-group">
                <label class="form-label">Product Packaging Weight (g)</label>
                <input type="number" class="form-control" id="prod-pack-weight" value="${Number(existing?.packagingWeightGrams) || 0}" min="0" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">Icon Emoji</label>
                <input type="text" class="form-control" id="prod-icon" value="${esc(existing?.icon || '📦')}">
              </div>
              <div class="form-group">
                <label class="form-label">Stock Status</label>
                <select class="form-select" id="prod-stock">
                  <option value="In Stock" ${existing?.stockStatus !== 'Out of Stock' ? 'selected' : ''}>In Stock</option>
                  <option value="Out of Stock" ${existing?.stockStatus === 'Out of Stock' ? 'selected' : ''}>Out of Stock</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Description *</label>
              <textarea class="form-control" id="prod-desc" rows="3" required>${esc(existing?.description || '')}</textarea>
            </div> 
            <div class="form-group" style="padding:1rem;border:1px solid var(--border-color);border-radius:10px;">
              <label class="form-label">🖼️ Product Image</label>
              <input type="file" class="form-control" id="prod-image" accept="image/jpeg,image/png,image/gif,image/webp">
              ${existing?.imageUrl ? `<div style="margin-top:.75rem;"><img src="${esc(existing.imageUrl)}" alt="Product" style="width:120px;height:90px;object-fit:cover;border-radius:10px;"></div>` : ''}
              <small class="text-muted">JPG, PNG, GIF or WEBP • maximum 10MB</small>
            </div> 
            <div class="form-group">
              <label style="display:flex;align-items:center;gap:.55rem;font-weight:700;">
                <input type="checkbox" id="prod-t7-shop" ${existing?.t7ShopEnabled || shopMode ? 'checked' : ''} style="width:18px;height:18px;">
                🛍️ Show this product in T7 Shop
              </label>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-body);">
              <div class="form-group"><label class="form-label">T7 Shop Category</label>
                <select class="form-select" id="prod-t7-category">
                  <option value="computers" ${existing?.t7ShopCategory==='computers' ? 'selected' : ''}>💻 Laptop & PC Sales</option>
                  <option value="amd" ${existing?.t7ShopCategory==='amd' ? 'selected' : ''}>🧩 AMD & PC Accessories</option>
                  <option value="design" ${existing?.t7ShopCategory==='design' ? 'selected' : ''}>🎨 Design & Printing</option>
                </select>
              </div>
              <div class="form-group"><label class="form-label">Customer Action</label>
                <select class="form-select" id="prod-t7-action">
                  <option value="enquiry" ${existing?.t7ShopAction!=='service' ? 'selected' : ''}>Buy / Enquire</option>
                  <option value="service" ${existing?.t7ShopAction==='service' ? 'selected' : ''}>Book / Enquire</option>
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group">
                <label class="form-label">Product Status</label>
                <select class="form-select" id="prod-status">
                  <option value="Active" ${existing?.status !== 'Inactive' ? 'selected' : ''}>Active</option>
                  <option value="Inactive" ${existing?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
              <label style="display:flex;align-items:center;gap:.5rem;padding-top:1.8rem;font-weight:600;">
                <input type="checkbox" id="prod-popular" ${existing?.popular ? 'checked' : ''} style="width:18px;height:18px;">
                Popular Badge
              </label>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="window.ModalComponent?.close()">Cancel</button>
              <button type="submit" class="btn btn-success">💾 ${productId ? 'Update Product' : 'Create Product'}</button>
            </div>
          </form>
        `;

        const modal = window.ModalComponent;
        if (!modal?.show) throw new Error('Modal component is not available');
        modal.show({ title: productId ? '✏️ Edit Product' : '➕ Add Product', bodyHTML: modalHTML, width: '700px' });
      } catch (err) {
        console.error('[CATALOG] Product modal failed:', err);
        NotificationService.showToast(`Unable to open product editor: ${err.message}`, 'error');
      }
    };

    window.saveProductForm = async (productId = '') => {
      const name = document.getElementById('prod-name')?.value.trim();
      const category = document.getElementById('prod-category')?.value || 'Accessory';
      const price = Number(document.getElementById('prod-price')?.value);
      const weightGrams = Number(document.getElementById('prod-weight')?.value);
      const packagingWeightGrams = Number(document.getElementById('prod-pack-weight')?.value || 0);
      const icon = document.getElementById('prod-icon')?.value.trim() || '📦';
      const stockStatus = document.getElementById('prod-stock')?.value || 'In Stock';
      const description = document.getElementById('prod-desc')?.value.trim();
      const status = document.getElementById('prod-status')?.value || 'Active';
      const popular = !!document.getElementById('prod-popular')?.checked;
       const t7ShopEnabled = !!document.getElementById('prod-t7-shop')?.checked;
       const t7ShopCategory = document.getElementById('prod-t7-category')?.value || 'computers';
       const t7ShopAction = document.getElementById('prod-t7-action')?.value || 'enquiry';

      let imageUrl = '';
       let imageStoragePath = '';
       const existingProducts = await DBService.getProductsCatalog();
       const existingProduct = productId ? existingProducts.find(p => p.id === productId) : null;
       imageUrl = existingProduct?.imageUrl || '';
       imageStoragePath = existingProduct?.imageStoragePath || '';
       const imageFile = document.getElementById('prod-image')?.files?.[0] || null;
       if (imageFile) {
         const upload = await StorageService.uploadCatalogImage(imageFile, 'products', productId || ('prod-' + Date.now()));
         imageUrl = upload.url || upload.downloadURL || imageUrl;
         imageStoragePath = upload.storagePath || imageStoragePath;
       }

       if (!name || !description || !Number.isFinite(price) || price < 0 || !Number.isFinite(weightGrams) || weightGrams < 0 || !Number.isFinite(packagingWeightGrams) || packagingWeightGrams < 0) {
        NotificationService.showToast('Please enter a valid product name, description and price.', 'warning');
        return;
      }

      try {
        await DBService.saveProductItem({
          ...(productId ? { id: productId } : {}),
          name, category, price, weightGrams, packagingWeightGrams, icon, stockStatus, description, status, popular,
           t7ShopEnabled, t7ShopCategory, t7ShopAction, imageUrl, imageStoragePath
        });

        window.ModalComponent?.close();
        NotificationService.showToast(productId ? 'Product updated successfully!' : 'Product created successfully!', 'success');
        await this.renderCatalog();
      } catch (err) {
        console.error('[CATALOG] Product save failed:', err);
        NotificationService.showToast('Failed to save product. Check Firebase connection/permissions.', 'error');
      }
    };

    window.deleteProductItem = async (productId) => {
      if (!productId) return;
      if (!confirm('Delete this product from the catalog?')) return;

      try {
        await DBService.deleteProductItem(productId);
        NotificationService.showToast('Product deleted.', 'info');
        await this.renderCatalog();
      } catch (err) {
        console.error('[CATALOG] Product delete failed:', err);
        NotificationService.showToast('Failed to delete product. Check Firebase permissions.', 'error');
      }
    };

    window.openCatalogModal = async (serviceId = null, shopMode = false) => {
      const allItems = await DBService.getServicesCatalog();
      const existing = serviceId ? allItems.find(item => item.id === serviceId) : null;

      const modalHTML = `
        <form id="catalog-form" onsubmit="event.preventDefault(); window.saveCatalogForm('${esc(serviceId || '')}');">
          <div class="form-group">
            <label class="form-label">Service Title *</label>
            <input type="text" class="form-control" id="cat-title" value="${esc(existing?.title || '')}" required>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
              <label class="form-label">Category</label>
              <input type="text" class="form-control" id="cat-category" value="${esc(existing?.category || 'General Printing')}">
            </div>
            <div class="form-group">
              <label class="form-label">Starting Price Tag *</label>
              <input type="text" class="form-control" id="cat-price" value="${esc(existing?.startingPrice || '')}" placeholder="₹25 / sheet" required>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
              <label class="form-label">Icon Emoji</label>
              <input type="text" class="form-control" id="cat-icon" value="${esc(existing?.icon || '📄')}">
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select class="form-select" id="cat-status">
                <option value="Active" ${existing?.status !== 'Inactive' ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${existing?.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description *</label>
            <textarea class="form-control" id="cat-desc" rows="3" required>${esc(existing?.description || '')}</textarea>
          </div> 
           <div class="form-group">
             <label style="display:flex;align-items:center;gap:.55rem;font-weight:700;">
               <input type="checkbox" id="cat-t7-shop" ${existing?.t7ShopEnabled || shopMode ? 'checked' : ''} style="width:18px;height:18px;">
               🛍️ Show this service in T7 Shop
             </label>
           </div>
           <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-body);">
             <div class="form-group"><label class="form-label">T7 Shop Category</label>
               <select class="form-select" id="cat-t7-category">
                 <option value="design" ${existing?.t7ShopCategory==='design' ? 'selected' : ''}>🎨 Design & Printing</option>
                 <option value="services" ${existing?.t7ShopCategory==='services' ? 'selected' : ''}>🛠️ Computer Services</option>
                 <option value="driver" ${existing?.t7ShopCategory==='driver' ? 'selected' : ''}>🚗 Driver Booking</option>
               </select>
             </div>
             <div class="form-group"><label class="form-label">Customer Action</label>
               <select class="form-select" id="cat-t7-action">
                 <option value="service" ${existing?.t7ShopAction!=='driver' ? 'selected' : ''}>Book / Enquire</option>
                 <option value="driver" ${existing?.t7ShopAction==='driver' ? 'selected' : ''}>Driver Booking</option>
               </select>
             </div>
           </div>

          <label style="display:flex;align-items:center;gap:.5rem;font-weight:600;">
            <input type="checkbox" id="cat-popular" ${existing?.popular ? 'checked' : ''} style="width:18px;height:18px;">
            Highlight as Popular Service
          </label>

          <div style="display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="window.ModalComponent?.close()">Cancel</button>
            <button type="submit" class="btn btn-success">💾 ${serviceId ? 'Update Service' : 'Create Service'}</button>
          </div>
        </form>
      `;

      const modal = window.ModalComponent;
      if (!modal?.show) {
        NotificationService.showToast('Unable to open service editor.', 'error');
        return;
      }
      modal.show({
        title: serviceId ? '✏️ Edit Service' : '➕ Add Service',
        bodyHTML: modalHTML,
        width: '650px'
      });
    };

    window.saveCatalogForm = async (serviceId = '') => {
      const title = document.getElementById('cat-title')?.value.trim();
      const category = document.getElementById('cat-category')?.value.trim() || 'General Printing';
      const startingPrice = document.getElementById('cat-price')?.value.trim();
      const icon = document.getElementById('cat-icon')?.value.trim() || '📄';
      const status = document.getElementById('cat-status')?.value || 'Active';
      const description = document.getElementById('cat-desc')?.value.trim();
      const popular = !!document.getElementById('cat-popular')?.checked;
       const t7ShopEnabled = !!document.getElementById('cat-t7-shop')?.checked;
       const t7ShopCategory = document.getElementById('cat-t7-category')?.value || 'design';
       const t7ShopAction = document.getElementById('cat-t7-action')?.value || 'service';

      if (!title || !startingPrice || !description) {
        NotificationService.showToast('Please fill out all required service fields.', 'warning');
        return;
      }

      try {
        await DBService.saveCatalogItem({
          ...(serviceId ? { id: serviceId } : {}),
          title, category, startingPrice, icon, status, description, popular,
           t7ShopEnabled, t7ShopCategory, t7ShopAction
        });

        window.ModalComponent?.close();
        NotificationService.showToast(serviceId ? 'Service updated successfully!' : 'Service created successfully!', 'success');
        await this.renderCatalog();
      } catch (err) {
        console.error('[CATALOG] Service save failed:', err);
        NotificationService.showToast('Failed to save service. Check Firebase connection/permissions.', 'error');
      }
    };

    window.deleteCatalogItem = async (serviceId) => {
      if (!serviceId) return;
      if (!confirm('Delete this service from the catalog?')) return;

      try {
        await DBService.deleteCatalogItem(serviceId);
        NotificationService.showToast('Service deleted.', 'info');
        await this.renderCatalog();
      } catch (err) {
        console.error('[CATALOG] Service delete failed:', err);
        NotificationService.showToast('Failed to delete service.', 'error');
      }
    };
  }
};
