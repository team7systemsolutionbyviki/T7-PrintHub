/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - DATABASE SERVICE
   PHP 8.x + MySQL Backend Engine (Hostinger Shared Hosting Compatible).
   Zero Node.js / Firestore / Realtime Database dependencies.
   ========================================================================== */

import { getServices } from '../config/firebase-config.js';
import {
  DEFAULT_SETTINGS,
  DEFAULT_PRICING,
  DEFAULT_SERVICES,
  DEFAULT_PRODUCTS,
  DEFAULT_SERVICE_CATEGORIES,
  DEFAULT_PRODUCT_CATEGORIES
} from '../config/default-data.js';

// In-memory caches for fast UI rendering
let _ordersCache = null;
let _settingsCache = null;
let _pricingCache = null;
let _catalogCache = null;
let _productsCache = null;
let _serviceBookingsCache = null;

async function getAuthToken() {
  const { auth } = getServices();
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {
      console.warn("Failed to get Firebase Auth ID token:", e);
    }
  }
  return null;
}

async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `API Request failed with HTTP ${response.status}`;
    try {
      const errRes = await response.json();
      if (errRes.message) errorMsg = errRes.message;
      else if (errRes.error) errorMsg = errRes.error;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  const json = await response.json();
  if (json && json.success === false) {
    throw new Error(json.message || 'API request failed');
  }

  return json;
}

export const DBService = {
  initLocalStore() {},

  // ══════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════════
  getSettingsSync() {
    if (_settingsCache) {
      return { ...DEFAULT_SETTINGS, ..._settingsCache };
    }
    return { ...DEFAULT_SETTINGS };
  },

  async getSettings(forceRefresh = false) {
    if (!forceRefresh && _settingsCache) return { ...DEFAULT_SETTINGS, ..._settingsCache };

    try {
      const res = await apiRequest('/api/settings/get.php');
      const settingsData = res.data || res.settings;
      if (settingsData && typeof settingsData === 'object') {
        _settingsCache = settingsData;
        return { ...DEFAULT_SETTINGS, ..._settingsCache };
      }
    } catch (err) {
      console.warn('[DBService] getSettings API warning:', err.message);
    }
    return this.getSettingsSync();
  },

  async saveSettings(newSettings) {
    try {
      const merged = { ...this.getSettingsSync(), ...newSettings };
      const res = await apiRequest('/api/settings/update.php', {
        method: 'POST',
        body: JSON.stringify(merged)
      });
      _settingsCache = res.data || merged;
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: _settingsCache }));
      return _settingsCache;
    } catch (err) {
      console.error('[DBService] saveSettings error:', err);
      throw err;
    }
  },

  onSettingsSnapshot(callback) {
    if (typeof callback === 'function') {
      window.addEventListener('settingsUpdated', (e) => callback(e.detail));
    }
    return Promise.resolve();
  },

  onSettingsSnap(callback) {
    return this.onSettingsSnapshot(callback);
  },

  // ══════════════════════════════════════════════════════════════════════
  // SERVICES CATALOG
  // ══════════════════════════════════════════════════════════════════════
  getServicesCatalogSync() {
    return _catalogCache || DEFAULT_SERVICES;
  },

  async getServicesCatalog(forceRefresh = false) {
    if (!forceRefresh && _catalogCache) return _catalogCache;

    try {
      const res = await apiRequest('/api/services/list.php?all=1');
      const servicesList = res.data || res.services;
      if (Array.isArray(servicesList)) {
        _catalogCache = servicesList.map(s => ({
          ...s,
          price: Number(s.price) || 0,
          startingPrice: s.starting_price !== undefined ? Number(s.starting_price) : Number(s.price) || 0,
          priceLabel: s.price_label || s.priceLabel || `Starting from ₹${s.starting_price || s.price}`
        }));
        return _catalogCache;
      }
    } catch (err) {
      console.warn('[DBService] getServicesCatalog API warning:', err.message);
    }
    return this.getServicesCatalogSync();
  },

  async saveServiceItem(serviceData) {
    try {
      const isUpdate = !!serviceData.id && !String(serviceData.id).startsWith('temp-');
      const endpoint = isUpdate ? '/api/services/update.php' : '/api/services/create.php';

      const payload = {
        ...serviceData,
        price: Number(serviceData.price) || 0,
        starting_price: serviceData.startingPrice !== undefined ? Number(serviceData.startingPrice) : Number(serviceData.price) || 0,
        price_label: serviceData.priceLabel || serviceData.startingPriceLabel || `Starting from ₹${serviceData.price}`
      };

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      await this.getServicesCatalog(true);
      return res.data || res.service;
    } catch (err) {
      console.error('[DBService] saveServiceItem error:', err);
      throw err;
    }
  },

  async deleteServiceItem(serviceId) {
    try {
      await apiRequest('/api/services/delete.php', {
        method: 'POST',
        body: JSON.stringify({ id: serviceId })
      });
      await this.getServicesCatalog(true);
      return true;
    } catch (err) {
      console.error('[DBService] deleteServiceItem error:', err);
      throw err;
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  // PRODUCTS CATALOG
  // ══════════════════════════════════════════════════════════════════════
  getProductsCatalogSync() {
    return _productsCache || DEFAULT_PRODUCTS;
  },

  async getProductsCatalog(forceRefresh = false) {
    if (!forceRefresh && _productsCache) return _productsCache;

    try {
      const res = await apiRequest('/api/products/list.php?all=1');
      const productsList = res.data || res.products;
      if (Array.isArray(productsList)) {
        _productsCache = productsList.map(p => ({
          ...p,
          price: Number(p.price) || 0,
          salePrice: p.sale_price !== null ? Number(p.sale_price) : null,
          stock: Number(p.stock) || 0
        }));
        return _productsCache;
      }
    } catch (err) {
      console.warn('[DBService] getProductsCatalog API warning:', err.message);
    }
    return this.getProductsCatalogSync();
  },

  async saveProductItem(productData) {
    try {
      const isUpdate = !!productData.id && !String(productData.id).startsWith('temp-');
      const endpoint = isUpdate ? '/api/products/update.php' : '/api/products/create.php';

      console.log("CREATE PRODUCT PAYLOAD:", productData);

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(productData)
      });

      await this.getProductsCatalog(true);
      return res.data || res.product;
    } catch (err) {
      console.error('[DBService] saveProductItem error:', err);
      throw err;
    }
  },

  async deleteProductItem(productId) {
    try {
      await apiRequest('/api/products/delete.php', {
        method: 'POST',
        body: JSON.stringify({ id: productId })
      });
      await this.getProductsCatalog(true);
      return true;
    } catch (err) {
      console.error('[DBService] deleteProductItem error:', err);
      throw err;
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  // BOOKINGS (PRINTING & HARDWARE)
  // ══════════════════════════════════════════════════════════════════════
  async getServiceBookings(forceRefresh = false) {
    if (!forceRefresh && _serviceBookingsCache) return _serviceBookingsCache;

    try {
      const res = await apiRequest('/api/bookings/list.php');
      const list = res.data || res.bookings;
      if (Array.isArray(list)) {
        _serviceBookingsCache = list;
        return _serviceBookingsCache;
      }
    } catch (err) {
      console.warn('[DBService] getServiceBookings API warning:', err.message);
    }
    return _serviceBookingsCache || [];
  },

  async getBookingById(bookingId) {
    try {
      const res = await apiRequest(`/api/bookings/get.php?id=${encodeURIComponent(bookingId)}`);
      return res.data || res.booking || null;
    } catch (err) {
      console.warn('[DBService] getBookingById API warning:', err.message);
    }
    return null;
  },

  async createServiceBooking(bookingData) {
    try {
      const res = await apiRequest('/api/bookings/create.php', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });

      const booking = res.data || res.booking;
      if (booking) {
        await this.getServiceBookings(true);
        return booking;
      }
      throw new Error('Failed to create booking.');
    } catch (err) {
      console.error('[DBService] createServiceBooking error:', err);
      throw err;
    }
  },

  async updateBookingStatus(bookingId, status, advanceAmount = null) {
    try {
      const res = await apiRequest('/api/bookings/update.php', {
        method: 'POST',
        body: JSON.stringify({ id: bookingId, status, advance_amount: advanceAmount })
      });
      await this.getServiceBookings(true);
      return res.data || res.booking;
    } catch (err) {
      console.error('[DBService] updateBookingStatus error:', err);
      throw err;
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  // STORE ORDERS
  // ══════════════════════════════════════════════════════════════════════
  async getOrders(forceRefresh = false) {
    if (!forceRefresh && _ordersCache) return _ordersCache;

    try {
      const res = await apiRequest('/api/orders/list.php');
      const list = res.data || res.orders;
      if (Array.isArray(list)) {
        _ordersCache = list;
        return _ordersCache;
      }
    } catch (err) {
      console.warn('[DBService] getOrders API warning:', err.message);
    }
    return _ordersCache || [];
  },

  async getOrderById(orderId) {
    try {
      const res = await apiRequest(`/api/orders/get.php?id=${encodeURIComponent(orderId)}`);
      return res.data || res.order || null;
    } catch (err) {
      console.warn('[DBService] getOrderById API warning:', err.message);
    }
    return null;
  },

  async createOrder(orderData) {
    try {
      const res = await apiRequest('/api/orders/create.php', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      const order = res.data || res.order;
      if (order) {
        await this.getOrders(true);
        return order;
      }
      throw new Error('Failed to create order.');
    } catch (err) {
      console.error('[DBService] createOrder error:', err);
      throw err;
    }
  },

  async updateOrderStatus(orderId, status, isFinal = false) {
    try {
      const res = await apiRequest('/api/orders/update.php', {
        method: 'POST',
        body: JSON.stringify({ id: orderId, status })
      });
      await this.getOrders(true);
      return res.data || res.order;
    } catch (err) {
      console.error('[DBService] updateOrderStatus error:', err);
      throw err;
    }
  },

  async updateOrderCourier(orderId, courierData) {
    try {
      return await this.updateOrderStatus(orderId, 'SHIPPED');
    } catch (err) {
      console.error('[DBService] updateOrderCourier error:', err);
      throw err;
    }
  },

  async deleteOrder(orderId) {
    try {
      await apiRequest('/api/orders/update.php', {
        method: 'POST',
        body: JSON.stringify({ id: orderId, status: 'CANCELLED' })
      });
      await this.getOrders(true);
      return true;
    } catch (err) {
      console.error('[DBService] deleteOrder error:', err);
      throw err;
    }
  },

  async searchOrders(queryStr) {
    const orders = await this.getOrders();
    const q = String(queryStr || '').toLowerCase().trim();
    if (!q) return orders;

    return orders.filter(o =>
      String(o.order_number || o.id).toLowerCase().includes(q) ||
      String(o.user_phone || '').includes(q) ||
      String(o.user_email || '').toLowerCase().includes(q)
    );
  },

  // ══════════════════════════════════════════════════════════════════════
  // CUSTOMERS & PRICING
  // ══════════════════════════════════════════════════════════════════════
  async getCustomers() {
    try {
      const res = await apiRequest('/api/customers/list.php');
      return res.data || [];
    } catch (err) {
      return [];
    }
  },

  async getPricing() {
    if (_pricingCache) return _pricingCache;
    return DEFAULT_PRICING;
  },

  async savePricing(pricingData) {
    _pricingCache = pricingData;
    return _pricingCache;
  },

  async getDashboardStats() {
    try {
      const res = await apiRequest('/api/admin/dashboard.php');
      return res.data || {};
    } catch (err) {
      console.warn('[DBService] getDashboardStats warning:', err);
      return {};
    }
  }
};
