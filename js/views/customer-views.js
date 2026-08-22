/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - CUSTOMER PORTAL VIEWS
   ========================================================================== */

import { AuthService } from '../services/auth-service.js?v=20260822_2';
import { DBService } from '../services/db-service.js';
import { formatCurrency, getStatusBadgeHTML, formatDate } from '../utils/formatters.js';
import { InvoiceComponent } from '../components/invoice.js';
import { ModalComponent } from '../components/modal.js';

export const CustomerViews = {
  async renderCustomerDashboard() {
    const user = AuthService.getCurrentUser();
    const app = document.getElementById('app-content');
    if (!app) return;

    // If customer is not logged in, display Phone Login / Order Lookup Form
    if (!user) {
      app.innerHTML = `
        <section style="min-height:75vh; display:flex; align-items:center; justify-content:center; padding:3rem 1rem;">
          <div class="glass-panel glow-effect" style="width:100%; max-width:440px; padding:2.5rem;">
            <div class="text-center mb-4">
              <div style="font-size:3rem; margin-bottom:0.5rem;">📱</div>
              <h2 style="font-size:1.75rem;">Customer Portal Access</h2>
              <p class="text-muted" style="font-size:0.875rem; margin-top:0.35rem;">Enter your mobile phone number to view all your document print orders, service bookings, and shop purchases.</p>
            </div>
            <form id="cust-login-form" onsubmit="event.preventDefault(); window.handleCustomerLogin();">
              <div class="form-group mb-3">
                <label class="form-label">Customer Mobile Phone Number *</label>
                <input type="tel" class="form-control" id="cust-login-phone" placeholder="E.g., 9876543210" required autofocus>
              </div>
              <div class="form-group mb-4">
                <label class="form-label">Your Name (Optional)</label>
                <input type="text" class="form-control" id="cust-login-name" placeholder="E.g., Ananya Sharma">
              </div>
              <button type="submit" class="btn btn-primary w-full glow-effect">Access My Dashboard ➔</button>
            </form>
            <div class="text-center mt-4" style="display:flex; justify-content:center; gap:0.5rem;">
              <a href="#order" class="btn btn-sm btn-outline">+ Print Order</a>
              <a href="#service-booking" class="btn btn-sm btn-outline">+ Book Service</a>
              <a href="#shop" class="btn btn-sm btn-outline">+ Shop Store</a>
            </div>
          </div>
        </section>
      `;

      window.handleCustomerLogin = () => {
        const phone = document.getElementById('cust-login-phone')?.value.trim();
        const name = document.getElementById('cust-login-name')?.value.trim() || 'Valued Customer';
        if (!phone) return;
        AuthService.loginCustomer(phone, name);
        this.renderCustomerDashboard();
      };
      return;
    }

    const [allOrders, serviceBookings, settings] = await Promise.all([
      DBService.getOrders(true),
      DBService.getServiceBookings(true),
      DBService.getSettings()
    ]);

    const userPhoneClean = (user.phone || '').replace(/\D/g, '');

    // Filter Print Orders vs Shop Orders
    const myPrintOrders = allOrders.filter(o => {
      if (o.orderType && o.orderType !== 'print') return false;
      const oPhoneClean = (o.customerPhone || '').replace(/\D/g, '');
      return (userPhoneClean && oPhoneClean && oPhoneClean === userPhoneClean) ||
             (user.displayName && o.customerName === user.displayName);
    });

    const myShopOrders = allOrders.filter(o => {
      if (o.orderType !== 'shop') return false;
      const oPhoneClean = (o.customerPhone || '').replace(/\D/g, '');
      return (userPhoneClean && oPhoneClean && oPhoneClean === userPhoneClean) ||
             (user.displayName && o.customerName === user.displayName);
    });

    const myServiceBookings = serviceBookings.filter(b => {
      const bPhoneClean = (b.customerPhone || b.customerWhatsapp || '').replace(/\D/g, '');
      return (userPhoneClean && bPhoneClean && bPhoneClean === userPhoneClean) ||
             (user.displayName && b.customerName === user.displayName);
    });

    app.innerHTML = `
      <section style="padding: 3rem 0 5rem 0;">
        <div class="container">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
            <div>
              <h1 style="font-size:2.25rem;">My Customer Portal</h1>
              <p class="text-muted">Logged in as: <b>${user.displayName}</b> (${user.phone || 'Guest'})</p>
            </div>
            <button class="btn btn-outline btn-sm" id="cust-logout-btn">🚪 Switch Phone / Logout</button>
          </div>

          <!-- Customer Portal Tabs -->
          <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;" id="cust-portal-tabs">
            <button class="btn btn-sm btn-primary cust-tab-btn" data-tab="tab-print">📄 Print Orders (${myPrintOrders.length})</button>
            <button class="btn btn-sm btn-outline cust-tab-btn" data-tab="tab-service">🔧 Service Bookings (${myServiceBookings.length})</button>
            <button class="btn btn-sm btn-outline cust-tab-btn" data-tab="tab-shop">🛍️ Shop Purchases (${myShopOrders.length})</button>
          </div>

          <!-- TAB 1: PRINT ORDERS -->
          <div class="cust-tab-content" id="tab-print">
            <div class="table-card">
              <div class="table-toolbar">
                <h3>My Print Orders (${myPrintOrders.length})</h3>
                <a href="#order" class="btn btn-sm btn-primary">+ Place New Print Order</a>
              </div>

              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Specifications & Files</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${myPrintOrders.length === 0 ? `
                      <tr>
                        <td colspan="6" class="text-center text-muted" style="padding:3.5rem;">
                          <div style="font-size:2.5rem; margin-bottom:0.5rem;">📄</div>
                          <h4>No print orders found</h4>
                          <a href="#order" class="btn btn-sm btn-primary mt-3">+ Place New Order Now</a>
                        </td>
                      </tr>
                    ` : myPrintOrders.map(o => {
                      const filesList = (o.files && o.files.length > 0) ? o.files : (o.file ? [o.file] : []);
                      const firstFile = filesList[0] || {};
                      const opts = firstFile.options || o.options || {};
                      const specSummary = `${opts.paperSize || 'A4'} (${opts.paperQuality || '70 GSM'}, ${opts.colorMode || 'B&W'}) • ${opts.copies || 1} copy(ies)${filesList.length > 1 ? ` (${filesList.length} PDFs)` : ''}`;

                      return `
                      <tr>
                        <td>
                          <b>${o.id}</b>
                          <div style="font-size:0.75rem; color:var(--text-muted);">${formatDate(o.createdAt)}</div>
                        </td>
                        <td>${formatDate(o.createdAt)}</td>
                        <td>
                          <div style="font-weight:600; font-size:0.875rem;">${specSummary}</div>
                          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                            ${filesList.map(f => f.name || 'Document.pdf').join(', ')}
                          </div>
                        </td>
                        <td><b>${formatCurrency(o.pricing?.total)}</b></td>
                        <td>${getStatusBadgeHTML(o.status)}</td>
                        <td>
                          <a href="#track?id=${o.id}" class="btn btn-sm btn-secondary">🔍 Track Order</a>
                        </td>
                      </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 2: SERVICE BOOKINGS -->
          <div class="cust-tab-content" id="tab-service" style="display:none;">
            <div class="table-card">
              <div class="table-toolbar">
                <h3>My Service Bookings (${myServiceBookings.length})</h3>
                <a href="#service-booking" class="btn btn-sm btn-primary">+ Book IT Service</a>
              </div>

              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Service Name</th>
                      <th>Schedule Date & Slot</th>
                      <th>Location Type</th>
                      <th>Est. Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${myServiceBookings.length === 0 ? `
                      <tr>
                        <td colspan="7" class="text-center text-muted" style="padding:3.5rem;">
                          <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔧</div>
                          <h4>No service bookings found</h4>
                          <a href="#service-booking" class="btn btn-sm btn-primary mt-3">+ Book a Service Now</a>
                        </td>
                      </tr>
                    ` : myServiceBookings.map(b => `
                      <tr>
                        <td><b>${b.id}</b></td>
                        <td>
                          <div style="font-weight:700;">${b.serviceName}</div>
                          <div style="font-size:0.75rem; color:var(--text-muted);">${b.serviceCategory}</div>
                        </td>
                        <td>
                          <div style="font-weight:600;">📅 ${b.bookingDate}</div>
                          <div style="font-size:0.75rem; color:var(--text-muted);">⏰ ${b.timeSlot}</div>
                        </td>
                        <td><span class="badge" style="font-size:0.72rem; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-main);">📍 ${b.serviceType}</span></td>
                        <td><b style="color:var(--primary);">${formatCurrency(b.estimatedPrice)}</b></td>
                        <td>${getStatusBadgeHTML(b.status)}</td>
                        <td>
                          <a href="#track-booking?id=${b.id}" class="btn btn-sm btn-secondary">🔍 Track</a>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- TAB 3: SHOP ORDERS -->
          <div class="cust-tab-content" id="tab-shop" style="display:none;">
            <div class="table-card">
              <div class="table-toolbar">
                <h3>My Shop Purchases (${myShopOrders.length})</h3>
                <a href="#shop" class="btn btn-sm btn-primary">+ Go to Shop Store</a>
              </div>

              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Items Summary</th>
                      <th>Payment Method</th>
                      <th>Grand Total</th>
                      <th>Order Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${myShopOrders.length === 0 ? `
                      <tr>
                        <td colspan="7" class="text-center text-muted" style="padding:3.5rem;">
                          <div style="font-size:2.5rem; margin-bottom:0.5rem;">🛍️</div>
                          <h4>No shop orders found</h4>
                          <a href="#shop" class="btn btn-sm btn-primary mt-3">+ Explore Shop Store</a>
                        </td>
                      </tr>
                    ` : myShopOrders.map(o => `
                      <tr>
                        <td><b>${o.id}</b></td>
                        <td>${formatDate(o.createdAt)}</td>
                        <td>
                          <div style="font-weight:600; font-size:0.875rem;">${(o.items || []).map(i => i.name).join(', ')}</div>
                          <div style="font-size:0.75rem; color:var(--text-muted);">${(o.items || []).length} item(s) • ${o.deliveryMethod}</div>
                        </td>
                        <td>
                          <div><b>${o.payment?.method || 'COD'}</b></div>
                          <div style="font-size:0.75rem; color:${(o.payment?.status === 'Verified' || o.payment?.status === 'Paid') ? 'var(--success)' : 'var(--warning)'}; font-weight:700;">
                            ● ${o.payment?.status || 'Pending'}
                          </div>
                        </td>
                        <td><b style="color:var(--primary);">${formatCurrency(o.pricing?.total)}</b></td>
                        <td>${getStatusBadgeHTML(o.orderStatus || o.status)}</td>
                        <td>
                          <button class="btn btn-sm btn-outline view-invoice-btn" data-id="${o.id}">🧾 Invoice</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </section>
    `;

    // Tab Switcher
    document.querySelectorAll('.cust-tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.cust-tab-btn').forEach(b => b.className = 'btn btn-sm btn-outline cust-tab-btn');
        btn.className = 'btn btn-sm btn-primary cust-tab-btn';

        document.querySelectorAll('.cust-tab-content').forEach(c => c.style.display = 'none');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.style.display = 'block';
      };
    });

    // Printable invoice modal for shop orders
    document.querySelectorAll('.view-invoice-btn').forEach(btn => {
      btn.onclick = async () => {
        const order = myShopOrders.find(o => o.id === btn.dataset.id);
        if (order) {
          const invoiceHTML = InvoiceComponent.renderHTML(order, settings);
          ModalComponent.open(invoiceHTML, { title: `Invoice: ${order.id}` });
        }
      };
    });

    document.getElementById('cust-logout-btn').onclick = async () => {
      await AuthService.logout();
      this.renderCustomerDashboard();
    };
  }
};

