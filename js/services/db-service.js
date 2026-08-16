/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - DATABASE SERVICE
   Firebase-Only Engine (Firestore + Realtime Database)
   In-memory cache for instant UI — Firebase is the single source of truth
   ========================================================================== */

import { getServices } from '../config/firebase-config.js';
import { DEFAULT_SETTINGS, DEFAULT_PRICING, DEFAULT_SERVICES, DEFAULT_PRODUCTS, DEFAULT_ABOUT_PAGE } from '../config/default-data.js';

// ── In-memory caches (zero-latency on second access, no localStorage) ───────
let _ordersCache   = null;   // Array<Order>  | null
let _settingsCache = null;   // Object        | null
let _pricingCache  = null;   // Object        | null
let _catalogCache  = null;   // Array<Service>| null
let _productsCache = null;   // Array<Product>| null
let _bookingCache  = null;   // Array<BookingRequest> | null
let _aboutCache    = null;   // Object | null
let _cloudSyncBusy = false;

// ── Lazy-load Firebase module references (cached by JS engine) ───────────────
let _fsModule   = null;   // Firestore module
let _rtdbModule = null;   // RTDB module

async function fs() {
  if (!_fsModule) _fsModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  return _fsModule;
}
async function rtdb() {
  if (!_rtdbModule) _rtdbModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
  return _rtdbModule;
}

// ── Helper: get Firestore & RTDB service handles ─────────────────────────────
function svc() { return getServices(); }

const SQL_API_BASE = (window.T7_API_BASE_URL || '/api').replace(/\/$/, '');

function parseServiceData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (_) { return {}; }
}

function normalizeSqlService(row) {
  const extra = parseServiceData(row.service_data);
  return normalizeServicePricing({
    ...extra,
    ...row,
    id: row.id,
    title: row.title || extra.title || '',
    category: row.category || extra.category || 'General Printing',
    description: row.description ?? extra.description ?? '',
    icon: row.icon || extra.icon || '📄',
    price: row.price ?? extra.price,
    priceUnit: row.price_unit || extra.priceUnit || extra.price_unit,
    startingPrice: row.starting_price || extra.startingPrice || '',
    popular: Number(row.popular) === 1 || row.popular === true || !!extra.popular,
    status: row.status || extra.status || 'Active',
    t7ShopEnabled: extra.t7ShopEnabled ?? extra.t7_shop_enabled ?? false,
    t7ShopCategory: extra.t7ShopCategory ?? extra.t7_shop_category ?? 'design',
    t7ShopAction: extra.t7ShopAction ?? extra.t7_shop_action ?? 'service',
    createdAt: row.created_at || extra.createdAt,
    updatedAt: row.updated_at || extra.updatedAt
  });
}

function serviceToSqlPayload(service) {
  const normalized = normalizeServicePricing(service);
  const priceMatch = String(normalized.startingPrice || '').match(/([0-9]+(?:\.[0-9]+)?)/);
  const price = Number.isFinite(Number(normalized.price)) ? Number(normalized.price) : (priceMatch ? Number(priceMatch[1]) : 0);
  const priceUnit = normalized.priceUnit || (() => {
    const raw = String(normalized.startingPrice || '');
    const slash = raw.indexOf('/');
    return slash >= 0 ? raw.slice(slash + 1).trim() : 'unit';
  })();

  const serviceData = {
    ...parseServiceData(normalized.service_data),
    t7ShopEnabled: !!normalized.t7ShopEnabled,
    t7ShopCategory: normalized.t7ShopCategory || 'design',
    t7ShopAction: normalized.t7ShopAction || 'service'
  };

  return {
    id: normalized.id,
    title: normalized.title || '',
    category: normalized.category || 'General Printing',
    description: normalized.description || '',
    icon: normalized.icon || '📄',
    price,
    price_unit: priceUnit,
    starting_price: normalized.startingPrice || `₹${price.toFixed(2)} / ${priceUnit}`,
    popular: !!normalized.popular,
    status: normalized.status || 'Active',
    service_data: serviceData
  };
}

async function sqlServicesRequest(path = '', options = {}) {
  const response = await fetch(`${SQL_API_BASE}/services${path}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  if (!response.ok) {
    const message = data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(`Services API ${response.status}: ${message}`);
  }
  return data;
}

function normalizeServicePricing(service) {
  const item = { ...service };
  if (item.price === undefined || item.price === null || item.price === '') {
    const match = String(item.startingPrice || '').match(/([0-9]+(?:\.[0-9]+)?)/);
    if (match) item.price = Number(match[1]);
  } else {
    item.price = Number(item.price) || 0;
  }
  if (!item.priceUnit) {
    const raw = String(item.startingPrice || '');
    const slash = raw.indexOf('/');
    item.priceUnit = slash >= 0 ? raw.slice(slash + 1).trim() : 'unit';
  }
  if (!item.startingPrice && Number.isFinite(item.price)) {
    item.startingPrice = `₹${item.price.toFixed(2)} / ${item.priceUnit || 'unit'}`;
  }
  return item;
}

export const DBService = {

  // No-op: kept for call-site compatibility — Firebase handles its own init
  initLocalStore() {},

  // ══════════════════════════════════════════════════════════════════════
  //  SETTINGS — Single source of truth: Firestore settings/general
  //  Priority: Firebase server data > in-memory cache > DEFAULT_SETTINGS
  //  DEFAULT_SETTINGS is a fallback ONLY — never overwrites Firebase data.
  // ══════════════════════════════════════════════════════════════════════

  // Singleton guard — prevents duplicate onSnapshot listeners
  _settingsUnsubscribe: null,

  // Synchronous getter for instant first-paint rendering (< 1ms).
  // Uses cached data if available, otherwise falls back to defaults.
  // Views that call this MUST handle the settingsUpdated event to re-render
  // with fresh Firebase data when the snapshot arrives.
  getSettingsSync() {
    if (_settingsCache) {
      console.log('[SETTINGS] SOURCE: CACHE', _settingsCache);
      return { ...DEFAULT_SETTINGS, ..._settingsCache };
    }
    console.log('[SETTINGS] SOURCE: DEFAULT', DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  },

  // Async getter — fetches directly from Firestore SERVER, bypasses local SDK cache.
  // forceRefresh=true (used at startup) clears in-memory cache so Firebase is always queried.
  // NEVER call this after getSettingsSync() has been called for first-render — use getSettingsSync()
  // only after _settingsCache has been warmed by this function.
  async getSettings(forceRefresh = false) {
    if (forceRefresh) {
      _settingsCache = null;
    }

    // Return in-memory cache if it was already populated from Firebase
    if (_settingsCache) {
      console.log('[SETTINGS] SOURCE: CACHE', _settingsCache);
      return { ...DEFAULT_SETTINGS, ..._settingsCache };
    }

    const { db, isDemo } = svc();

    // Fetch from Firestore — use source:'server' to bypass Firestore's own local cache
    if (!isDemo && db) {
      try {
        const { doc, getDoc } = await fs();
        const docRef = doc(db, 'settings', 'general');
        // source:'server' forces a network round-trip, ignoring Firestore's memory/IndexedDB cache
        const snap = await getDoc(docRef, { source: 'server' }).catch(() => getDoc(docRef));

        if (snap && snap.exists()) {
          _settingsCache = { ...DEFAULT_SETTINGS, ...snap.data() };
          console.log('[SETTINGS] SOURCE: FIREBASE', snap.data());
          console.log('[SETTINGS] FINAL', _settingsCache);
          return _settingsCache;
        }
      } catch (e) {
        console.warn('[SETTINGS] Firestore fetch error:', e);
      }
    }

    // Last resort fallback — Firebase unavailable (no connection, demo mode, etc.)
    _settingsCache = { ...DEFAULT_SETTINGS };
    console.log('[SETTINGS] SOURCE: DEFAULT (Firebase unavailable)', DEFAULT_SETTINGS);
    console.log('[SETTINGS] FINAL', _settingsCache);
    return _settingsCache;
  },

  // Save ALL settings to Firestore with { merge: true }.
  // After saving: clears cache, then lets onSnapshot repopulate from server.
  async saveSettings(settings) {
    const { db, isDemo } = svc();

    // Build the merged settings object (new values win)
    const merged = { ...DEFAULT_SETTINGS, ..._settingsCache, ...settings };

    if (!isDemo && db) {
      try {
        const { doc, setDoc } = await fs();
        // { merge: true } prevents deleting any existing Firestore fields
        await setDoc(doc(db, 'settings', 'general'), merged, { merge: true });
        console.log('[SETTINGS] Saved to Firebase:', merged);
      } catch (e) {
        console.warn('[SETTINGS] Save error:', e);
        throw e;
      }
    }

    // Update in-memory cache with the freshly saved values
    _settingsCache = merged;

    // Notify all pages/components of the update
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: _settingsCache }));
    return _settingsCache;
  },

  // Real-time Firestore listener — SINGLETON. Only ONE listener ever exists.
  // Fires ONLY for server-confirmed data (ignores fromCache snapshots) so
  // there is no race between old local-cache data and fresh server data.
  async onSettingsSnapshot(callback) {
    // Unsubscribe any existing listener before creating a new one (singleton pattern)
    if (this._settingsUnsubscribe) {
      try { this._settingsUnsubscribe(); } catch (e) {}
      this._settingsUnsubscribe = null;
    }

    const { db, isDemo } = svc();
    if (isDemo || !db) return null;

    try {
      const { doc, onSnapshot } = await fs();
      const settingsRef = doc(db, 'settings', 'general');

      this._settingsUnsubscribe = onSnapshot(
        settingsRef,
        { includeMetadataChanges: true }, // Required to check fromCache flag
        (snap) => {
          // CRITICAL: Skip snapshots served from Firestore's local cache.
          // Only accept confirmed server data to prevent alternating old/new values.
          if (snap.metadata.fromCache) {
            console.log('[SETTINGS] Skipping cached snapshot (waiting for server data)');
            return;
          }

          if (!snap.exists()) {
            console.log('[SETTINGS] No settings document in Firestore');
            return;
          }

          // Server-confirmed data — always overrides defaults
          const serverData = snap.data();
          _settingsCache = { ...DEFAULT_SETTINGS, ...serverData };

          console.log('[SETTINGS] SOURCE: FIREBASE (real-time server)', serverData);
          console.log('[SETTINGS] FINAL', _settingsCache);

          window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: _settingsCache }));
          if (typeof callback === 'function') callback(_settingsCache);
        },
        (err) => {
          console.warn('[SETTINGS] Snapshot listener error:', err);
        }
      );

      return this._settingsUnsubscribe;
    } catch (e) {
      console.warn('[SETTINGS] Could not start snapshot listener:', e);
      return null;
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  //  PRICING
  // ══════════════════════════════════════════════════════════════════════

  async getPricing() {
    if (_pricingCache) return _pricingCache;
    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { doc, getDoc } = await fs();
        const snap = await getDoc(doc(db, 'settings', 'pricing'));
        if (snap.exists()) {
          _pricingCache = snap.data();
          return _pricingCache;
        }
      } catch (e) {}
    }
    _pricingCache = { ...DEFAULT_PRICING };
    return _pricingCache;
  },

  async savePricing(pricing) {
    _pricingCache = { ...pricing };
    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { doc, setDoc } = await fs();
        await setDoc(doc(db, 'settings', 'pricing'), pricing);
      } catch (e) {
        console.warn('Save pricing error:', e);
      }
    }
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  ORDER MERGE HELPER
  // ══════════════════════════════════════════════════════════════════════

  mergeOrderObjects(existing, incoming) {
    if (!existing) return incoming;
    if (!incoming) return existing;
    const merged = { ...existing, ...incoming };

    // Smart-merge files array
    if (existing.files || incoming.files) {
      const l1 = existing.files || [], l2 = incoming.files || [];
      const max = Math.max(l1.length, l2.length);
      const mergedFiles = [];
      for (let i = 0; i < max; i++) {
        const f1 = l1[i] || {}, f2 = l2[i] || {};
        const u1 = f1.url || f1.dataUrl || '', u2 = f2.url || f2.dataUrl || '';
        let bestUrl = u1;
        if (u2.startsWith('https://') || u2.startsWith('http://')) bestUrl = u2;
        else if (u1.startsWith('https://') || u1.startsWith('http://')) bestUrl = u1;
        else if (u2.length > u1.length) bestUrl = u2;
        const bestData  = (f2.dataUrl && f2.dataUrl.length > 500) ? f2.dataUrl : (f1.dataUrl || (bestUrl.startsWith('data:') ? bestUrl : ''));
        const bestPath  = f2.storagePath || f1.storagePath || '';
        mergedFiles.push({ ...f1, ...f2, url: bestUrl, dataUrl: bestData, storagePath: bestPath });
      }
      merged.files = mergedFiles;
    }

    // Smart-merge payment screenshot
    if (existing.payment || incoming.payment) {
      const p1 = existing.payment || {}, p2 = incoming.payment || {};
      const s1 = p1.screenshotUrl || p1.screenshotDataUrl || '';
      const s2 = p2.screenshotUrl || p2.screenshotDataUrl || '';
      const best = s2.length > s1.length ? s2 : (s1 || s2);
      merged.payment = {
        ...p1, ...p2,
        screenshotUrl:     best,
        screenshotDataUrl: p2.screenshotDataUrl || p1.screenshotDataUrl || (best.startsWith('data:') ? best : '')
      };
    }
    return merged;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  GET ALL ORDERS — Firebase only, parallel fetch, memory cache
  // ══════════════════════════════════════════════════════════════════════

  async getOrders(forceRefresh = false) {
    // 1. Return in-memory cache immediately unless forceRefresh requested
    if (_ordersCache && !forceRefresh) return _ordersCache;

    const { db, firebaseApp, isDemo } = svc();

    if (isDemo || !firebaseApp) {
      _ordersCache = _ordersCache || [];
      return _ordersCache;
    }

    // 2. Parallel fetch from Firestore + RTDB
    _cloudSyncBusy = true;
    try {
      const map = new Map();

      const [fsResult, rtResult] = await Promise.allSettled([
        // Firestore
        (async () => {
          if (!db) return [];
          const { collection, getDocs, query, orderBy } = await fs();
          const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        })(),
        // Realtime Database
        (async () => {
          const { getDatabase, ref, get } = await rtdb();
          const db2 = getDatabase(firebaseApp);
          const snap = await get(ref(db2, 'orders'));
          if (!snap.exists()) return [];
          return Object.entries(snap.val()).map(([id, o]) => ({ id, ...o }));
        })()
      ]);

      if (fsResult.status === 'fulfilled') {
        fsResult.value.forEach(o => map.set(o.id, this.mergeOrderObjects(map.get(o.id), o)));
      }
      if (rtResult.status === 'fulfilled') {
        rtResult.value.forEach(o => map.set(o.id, this.mergeOrderObjects(map.get(o.id), o)));
      }

      _ordersCache = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      console.warn('getOrders error:', e);
      _ordersCache = _ordersCache || [];
    } finally {
      _cloudSyncBusy = false;
    }

    return _ordersCache;
  },

  invalidateOrdersCache() {
    _ordersCache = null;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SEARCH & GET BY ID
  // ══════════════════════════════════════════════════════════════════════

  async searchOrders(queryStr, forceRefresh = false) {
    const orders = await this.getOrders(forceRefresh);
    const q = queryStr.trim().toLowerCase();
    return orders.filter(o =>
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.orderId && o.orderId.toLowerCase().includes(q)) ||
      (o.customerPhone || '').includes(q) ||
      (o.customerName || '').toLowerCase().includes(q)
    );
  },

  async getOrderById(orderId, forceRefresh = false) {
    // Try cache first if forceRefresh is false
    if (_ordersCache && !forceRefresh) {
      const found = _ordersCache.find(o => o.id === orderId || o.orderId === orderId);
      if (found) return found;
    }
    // Direct Firestore lookup (fast single-doc read)
    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { doc, getDoc } = await fs();
        const snap = await getDoc(doc(db, 'orders', orderId));
        if (snap.exists()) {
          const freshDoc = { id: snap.id, ...snap.data() };
          if (_ordersCache) {
            const idx = _ordersCache.findIndex(o => o.id === orderId || o.orderId === orderId);
            if (idx !== -1) _ordersCache[idx] = this.mergeOrderObjects(_ordersCache[idx], freshDoc);
            else _ordersCache.unshift(freshDoc);
          }
          return freshDoc;
        }
      } catch (e) {}
    }
    return null;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SANITIZE FOR CLOUD (keep large dataUrls; strip from Firestore if huge)
  // ══════════════════════════════════════════════════════════════════════

  sanitizeForCloud(order, isFirestore = false) {
    if (!order) return order;
    try {
      const cloud = JSON.parse(JSON.stringify(order));
      if (cloud.files && Array.isArray(cloud.files)) {
        cloud.files.forEach(f => {
          const url = f.url || f.dataUrl || '';
          if (url.startsWith('https://') || url.startsWith('http://')) {
            f.url = url;
            delete f.dataUrl;
          } else if (url.startsWith('data:')) {
            if (isFirestore && url.length > 800000) {
              f.url = f.storagePath ? '' : url;
              if (f.storagePath && f.dataUrl) delete f.dataUrl;
            } else {
              f.url = url;
              f.dataUrl = url;
            }
          }
        });
      }
      if (cloud.payment) {
        const scr = cloud.payment.screenshotUrl || cloud.payment.screenshotDataUrl || '';
        if (scr) { cloud.payment.screenshotUrl = scr; cloud.payment.screenshotDataUrl = scr; }
      }
      return cloud;
    } catch (e) { return order; }
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CREATE ORDER — instant memory update + parallel Firebase writes
  // ══════════════════════════════════════════════════════════════════════

  async createOrder(orderData) {
    const newId     = orderData.id || orderData.orderId || ('ORD-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000));
    const firstFile = orderData.files?.[0] || orderData.documents?.[0] || {};
    const createdAt = orderData.createdAt || new Date().toISOString();

    const newOrder = {
      id:              newId,
      orderId:         newId,
      customerName:    orderData.customerName    || 'Customer',
      customerPhone:   orderData.phone || orderData.customerPhone   || '',
      customerEmail:   orderData.email || orderData.customerEmail   || '',
      customerAddress: orderData.customerAddress || '',
      fileName:        firstFile.fileName || firstFile.name || 'document.pdf',
      fileType:        firstFile.fileType || firstFile.type || 'application/pdf',
      fileSize:        firstFile.fileSize || firstFile.size || 'N/A',
      storagePath:     firstFile.storagePath || null,
      downloadURL:     firstFile.downloadURL || firstFile.url || null,
      uploadedAt:      firstFile.uploadedAt || createdAt,
      uploadStatus:    firstFile.uploadStatus || 'uploaded',
      expiresAt:       firstFile.expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      documents:       orderData.documents || orderData.files || [],
      files:           orderData.files || orderData.documents || [],
      printSettings:   orderData.options || {},
      totalAmount:     orderData.grandTotal || orderData.pricing?.total || orderData.totalAmount || 0,
      paymentStatus:   orderData.paymentStatus || 'Waiting Verification',
      orderStatus:     orderData.orderStatus || 'Waiting Verification',
      status:          orderData.status || 'Waiting Verification',
      createdAt,
      updatedAt:       createdAt,
      estimatedReady:  new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      ...orderData
    };

    // 1. Update in-memory cache
    if (_ordersCache) {
      const existingIdx = _ordersCache.findIndex(o => o.id === newId || o.orderId === newId);
      if (existingIdx !== -1) {
        _ordersCache[existingIdx] = newOrder;
      } else {
        _ordersCache.unshift(newOrder);
      }
    } else {
      _ordersCache = [newOrder];
    }

    // 2. Await Firestore write confirmation
    const { db, firebaseApp, isDemo } = svc();
    if (!isDemo && firebaseApp) {
      if (db) {
        const { doc, setDoc } = await fs();
        await setDoc(doc(db, 'orders', newId), this.sanitizeForCloud(newOrder, true));
        console.log('✅ Firestore order saved successfully:', newId);
      }
      (async () => {
        try {
          const { getDatabase, ref, set } = await rtdb();
          const db2 = getDatabase(firebaseApp);
          await set(ref(db2, 'orders/' + newId), this.sanitizeForCloud(newOrder, false));
          console.log('✅ RTDB order synced:', newId);
        } catch (e) {
          console.warn('RTDB sync warning:', e);
        }
      })();
    }

    return newOrder;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  UPDATE ORDER STATUS — instant memory + parallel cloud writes
  // ══════════════════════════════════════════════════════════════════════

  async updateOrderStatus(orderId, newStatus, isLocked = null) {
    const orders = _ordersCache || (await this.getOrders());
    const idx    = orders.findIndex(o => o.id === orderId || o.orderId === orderId);

    const updatedAt = new Date().toISOString();
    let isStatusLocked = isLocked;
    if (isStatusLocked === null && (newStatus === 'Completed' || newStatus === 'Rejected')) {
      isStatusLocked = true;
    }

    if (idx !== -1) {
      orders[idx].status      = newStatus;
      orders[idx].orderStatus = newStatus;
      orders[idx].updatedAt   = updatedAt;
      if (isStatusLocked !== null) orders[idx].isStatusLocked = isStatusLocked;
      if (newStatus === 'Payment Approved' && orders[idx].payment) {
        orders[idx].payment.status = 'Verified';
      }
      _ordersCache = orders;
    }

    // Firestore update payload (supports dot notation)
    const fsUpdateObj = {
      status:      newStatus,
      orderStatus: newStatus,
      updatedAt
    };
    if (isStatusLocked !== null && isStatusLocked !== undefined) fsUpdateObj.isStatusLocked = isStatusLocked;
    if (newStatus === 'Payment Approved') fsUpdateObj['payment.status'] = 'Verified';

    // RTDB update payload (slash notation for nested paths)
    const rtdbUpdateObj = {
      status:      newStatus,
      orderStatus: newStatus,
      updatedAt
    };
    if (isStatusLocked !== null && isStatusLocked !== undefined) rtdbUpdateObj.isStatusLocked = isStatusLocked;
    if (newStatus === 'Payment Approved') rtdbUpdateObj['payment/status'] = 'Verified';

    // Parallel Firebase writes
    const { db, firebaseApp, isDemo } = svc();
    if (!isDemo && firebaseApp) {
      try {
        await Promise.allSettled([
          db ? (async () => {
            const { doc, updateDoc } = await fs();
            await updateDoc(doc(db, 'orders', orderId), fsUpdateObj);
          })() : Promise.resolve(),
          (async () => {
            const { getDatabase, ref, update } = await rtdb();
            const db2 = getDatabase(firebaseApp);
            await update(ref(db2, 'orders/' + orderId), rtdbUpdateObj);
          })()
        ]);
      } catch (e) {
        console.warn('Status sync error:', e);
      }
    }

    return idx !== -1 ? orders[idx] : { id: orderId, status: newStatus, orderStatus: newStatus };
  },

  async updatePaymentStatus(orderId, newPaymentStatus, rejectionReason = '') {
    const orders = _ordersCache || (await this.getOrders());
    const idx = orders.findIndex(o => o.id === orderId || o.orderId === orderId);

    const updatedAt = new Date().toISOString();
    let orderStatusUpdate = null;
    if (newPaymentStatus === 'Verified') orderStatusUpdate = 'Payment Approved';
    if (newPaymentStatus === 'Rejected') orderStatusUpdate = 'Rejected';

    if (idx !== -1) {
      orders[idx].paymentStatus = newPaymentStatus;
      if (!orders[idx].payment) orders[idx].payment = {};
      orders[idx].payment.status = newPaymentStatus;
      orders[idx].updatedAt = updatedAt;
      if (rejectionReason) orders[idx].rejectionReason = rejectionReason;
      if (orderStatusUpdate) {
        orders[idx].status = orderStatusUpdate;
        orders[idx].orderStatus = orderStatusUpdate;
        if (orderStatusUpdate === 'Rejected') orders[idx].isStatusLocked = true;
      }
      _ordersCache = orders;
    }

    const fsUpdateObj = {
      paymentStatus: newPaymentStatus,
      'payment.status': newPaymentStatus,
      updatedAt
    };
    if (rejectionReason) fsUpdateObj.rejectionReason = rejectionReason;
    if (orderStatusUpdate) {
      fsUpdateObj.status = orderStatusUpdate;
      fsUpdateObj.orderStatus = orderStatusUpdate;
      if (orderStatusUpdate === 'Rejected') fsUpdateObj.isStatusLocked = true;
    }

    const rtdbUpdateObj = {
      paymentStatus: newPaymentStatus,
      'payment/status': newPaymentStatus,
      updatedAt
    };
    if (rejectionReason) rtdbUpdateObj.rejectionReason = rejectionReason;
    if (orderStatusUpdate) {
      rtdbUpdateObj.status = orderStatusUpdate;
      rtdbUpdateObj.orderStatus = orderStatusUpdate;
      if (orderStatusUpdate === 'Rejected') rtdbUpdateObj.isStatusLocked = true;
    }

    const { db, firebaseApp, isDemo } = svc();
    if (!isDemo && firebaseApp) {
      try {
        await Promise.allSettled([
          db ? (async () => {
            const { doc, updateDoc } = await fs();
            await updateDoc(doc(db, 'orders', orderId), fsUpdateObj);
          })() : Promise.resolve(),
          (async () => {
            const { getDatabase, ref, update } = await rtdb();
            const db2 = getDatabase(firebaseApp);
            await update(ref(db2, 'orders/' + orderId), rtdbUpdateObj);
          })()
        ]);
      } catch (e) {
        console.warn('Cloud update payment status:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: _ordersCache }));
    return idx !== -1 ? orders[idx] : null;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  COURIER / AWB DISPATCH
  // ══════════════════════════════════════════════════════════════════════

  async updateOrderCourier(orderId, courierData) {
    const orders = _ordersCache || (await this.getOrders());
    const idx = orders.findIndex(o => o.id === orderId || o.orderId === orderId);
    const updatedAt = new Date().toISOString();
    const existing = idx !== -1 ? (orders[idx].courier || {}) : {};

    const courier = {
      ...existing,
      ...courierData,
      updatedAt
    };

    if (idx !== -1) {
      orders[idx].courier = courier;
      orders[idx].updatedAt = updatedAt;
      _ordersCache = orders;
    }

    const { db, firebaseApp, isDemo } = svc();
    if (!isDemo && firebaseApp) {
      try {
        const writes = [];
        if (db) {
          writes.push((async () => {
            const { doc, updateDoc } = await fs();
            await updateDoc(doc(db, 'orders', orderId), {
              courier,
              updatedAt
            });
          })());
        }
        writes.push((async () => {
          const { getDatabase, ref, update } = await rtdb();
          const db2 = getDatabase(firebaseApp);
          await update(ref(db2, 'orders/' + orderId), {
            courier,
            updatedAt
          });
        })());
        await Promise.allSettled(writes);
      } catch (e) {
        console.warn('[COURIER] Sync error:', e);
        throw e;
      }
    }

    return idx !== -1 ? orders[idx] : { id: orderId, courier };
  },

  // ══════════════════════════════════════════════════════════════════════
  //  ARCHIVE / DELETE ORDER & RESTORE
  // ══════════════════════════════════════════════════════════════════════

  async deleteOrder(orderId, adminName = 'Admin') {
    const orders = _ordersCache || (await this.getOrders());
    const idx = orders.findIndex(o => o.id === orderId || o.orderId === orderId);

    const deletedAt = new Date().toISOString();
    let orderToArchive = null;

    if (idx !== -1) {
      const existing = orders[idx];
      existing.deleted = true;
      existing.deletedAt = deletedAt;
      existing.deletedBy = adminName;
      existing.previousStatus = existing.status || existing.orderStatus || 'Waiting Verification';
      existing.status = 'Deleted';
      existing.orderStatus = 'Deleted';
      orderToArchive = { ...existing };
      _ordersCache[idx] = existing;
    }

    if (!orderToArchive) {
      orderToArchive = {
        id: orderId,
        orderId,
        deleted: true,
        deletedAt,
        deletedBy: adminName,
        status: 'Deleted',
        orderStatus: 'Deleted'
      };
    }

    // Update main order doc to deleted: true AND copy to deletedOrders collection
    const { db, firebaseApp, isDemo } = svc();
    if (!isDemo && firebaseApp) {
      const fsUpdateObj = {
        deleted: true,
        deletedAt,
        deletedBy: adminName,
        previousStatus: orderToArchive.previousStatus || 'Waiting Verification',
        status: 'Deleted',
        orderStatus: 'Deleted'
      };

      const rtdbUpdateObj = {
        deleted: true,
        deletedAt,
        deletedBy: adminName,
        previousStatus: orderToArchive.previousStatus || 'Waiting Verification',
        status: 'Deleted',
        orderStatus: 'Deleted'
      };

      try {
        await Promise.allSettled([
          db ? (async () => {
            const { doc, updateDoc, setDoc } = await fs();
            await updateDoc(doc(db, 'orders', orderId), fsUpdateObj);
            // Copy full order to archive collection `deletedOrders`
            await setDoc(doc(db, 'deletedOrders', orderId), this.sanitizeForCloud({
              ...orderToArchive,
              originalOrderId: orderId,
              archivedAt: deletedAt
            }, true));
          })() : Promise.resolve(),
          (async () => {
            const { getDatabase, ref, update, set } = await rtdb();
            const db2 = getDatabase(firebaseApp);
            await update(ref(db2, 'orders/' + orderId), rtdbUpdateObj);
            await set(ref(db2, 'deletedOrders/' + orderId), this.sanitizeForCloud({
              ...orderToArchive,
              originalOrderId: orderId,
              archivedAt: deletedAt
            }, false));
          })()
        ]);
      } catch (e) {
        console.warn('Cloud archive order error:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: _ordersCache }));
    return true;
  },

  async restoreOrder(orderId) {
    const orders = _ordersCache || (await this.getOrders());
    const idx = orders.findIndex(o => o.id === orderId || o.orderId === orderId);

    const updatedAt = new Date().toISOString();
    let restoredStatus = 'Waiting Verification';

    if (idx !== -1) {
      const existing = orders[idx];
      restoredStatus = existing.previousStatus && existing.previousStatus !== 'Deleted' ? existing.previousStatus : 'Waiting Verification';
      existing.deleted = false;
      existing.deletedAt = null;
      existing.deletedBy = null;
      existing.status = restoredStatus;
      existing.orderStatus = restoredStatus;
      existing.updatedAt = updatedAt;
      _ordersCache[idx] = existing;
    }

    const { db, firebaseApp, isDemo } = svc();
    if (!isDemo && firebaseApp) {
      const fsUpdateObj = {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        status: restoredStatus,
        orderStatus: restoredStatus,
        updatedAt
      };

      const rtdbUpdateObj = {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        status: restoredStatus,
        orderStatus: restoredStatus,
        updatedAt
      };

      try {
        await Promise.allSettled([
          db ? (async () => {
            const { doc, updateDoc, deleteDoc } = await fs();
            await updateDoc(doc(db, 'orders', orderId), fsUpdateObj);
            await deleteDoc(doc(db, 'deletedOrders', orderId)).catch(() => {});
          })() : Promise.resolve(),
          (async () => {
            const { getDatabase, ref, update, remove } = await rtdb();
            const db2 = getDatabase(firebaseApp);
            await update(ref(db2, 'orders/' + orderId), rtdbUpdateObj);
            await remove(ref(db2, 'deletedOrders/' + orderId)).catch(() => {});
          })()
        ]);
      } catch (e) {
        console.warn('Cloud restore order error:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: _ordersCache }));
    return true;
  },

  async getActiveOrders(forceRefresh = false) {
    const orders = await this.getOrders(forceRefresh);
    return orders.filter(o => o.deleted !== true);
  },

  async getAllOrders(forceRefresh = false) {
    return await this.getOrders(forceRefresh);
  },

  async getDeletedOrders(forceRefresh = false) {
    const orders = await this.getOrders(forceRefresh);
    return orders.filter(o => o.deleted === true);
  },

  // ══════════════════════════════════════════════════════════════════════
  //  UPDATE ORDER IN CLOUD (used by storage cleanup callback)
  // ══════════════════════════════════════════════════════════════════════

  async updateOrderInCloud(order) {
    if (!order?.id) return;
    const { db, firebaseApp, isDemo } = svc();
    if (isDemo || !firebaseApp) return;
    await Promise.allSettled([
      db ? (async () => {
        const { doc, setDoc } = await fs();
        await setDoc(doc(db, 'orders', order.id), this.sanitizeForCloud(order, true));
      })() : Promise.resolve(),
      (async () => {
        const { getDatabase, ref, set } = await rtdb();
        const db2 = getDatabase(firebaseApp);
        await set(ref(db2, 'orders/' + order.id), this.sanitizeForCloud(order, false));
      })()
    ]);
  },

  // ══════════════════════════════════════════════════════════════════════
  //  CUSTOMERS (aggregate from live order cache)
  // ══════════════════════════════════════════════════════════════════════

  async getCustomers() {
    const orders = await this.getOrders();
    const map = {};
    orders.forEach(o => {
      const phone = o.customerPhone || 'unknown';
      if (!map[phone]) {
        map[phone] = {
          name:          o.customerName,
          phone:         o.customerPhone,
          email:         o.customerEmail || 'N/A',
          totalOrders:   0,
          totalSpent:    0,
          lastOrderDate: o.createdAt
        };
      }
      map[phone].totalOrders += 1;
      if (o.status !== 'Rejected') map[phone].totalSpent += (o.pricing?.total || 0);
      if (new Date(o.createdAt) > new Date(map[phone].lastOrderDate)) map[phone].lastOrderDate = o.createdAt;
    });
    return Object.values(map);
  },

  // ══════════════════════════════════════════════════════════════════════
  //  PRODUCTS / STATIONERY CATALOG — Firestore backed, memory cached
  // ══════════════════════════════════════════════════════════════════════

  getProductsCatalogSync() {
    return _productsCache || DEFAULT_PRODUCTS;
  },

  async getProductsCatalog() {
    if (_productsCache) return _productsCache;
    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { collection, getDocs } = await fs();
        const snap = await getDocs(collection(db, 'products'));
        if (!snap.empty) {
          _productsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          return _productsCache;
        }
      } catch (e) {
        console.warn('[PRODUCTS] Fetch error:', e);
      }
    }

    // Seed defaults only when the products collection is empty/unavailable.
    _productsCache = DEFAULT_PRODUCTS.map(p => ({ ...p }));
    if (!isDemo && db) {
      try {
        const { doc, setDoc } = await fs();
        for (const item of _productsCache) {
          await setDoc(doc(db, 'products', item.id), item, { merge: true });
        }
      } catch (e) {
        console.warn('[PRODUCTS] Seed error:', e);
      }
    }
    window.dispatchEvent(new CustomEvent('productsUpdated', { detail: _productsCache }));
    return _productsCache;
  },

  async saveProductItem(productData) {
    const products = await this.getProductsCatalog();
    let targetItem = null;

    if (productData.id) {
      const idx = products.findIndex(p => p.id === productData.id);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...productData };
        targetItem = products[idx];
      }
    }

    if (!targetItem) {
      targetItem = {
        id: productData.id || 'prod-' + Date.now(),
        name: productData.name || 'New Product',
        category: productData.category || 'Accessory',
        price: Number(productData.price) || 0,
        icon: productData.icon || '📦',
        stockStatus: productData.stockStatus || 'In Stock',
        description: productData.description || '',
        popular: !!productData.popular,
        status: productData.status || 'Active',
        ...productData
      };
      products.unshift(targetItem);
    }

    _productsCache = products;
    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { doc, setDoc } = await fs();
        await setDoc(doc(db, 'products', targetItem.id), targetItem, { merge: true });
      } catch (e) {
        console.warn('[PRODUCTS] Save error:', e);
        throw e;
      }
    }
    window.dispatchEvent(new CustomEvent('productsUpdated', { detail: _productsCache }));
    return targetItem;
  },

  async deleteProductItem(productId) {
    const products = await this.getProductsCatalog();
    _productsCache = products.filter(p => p.id !== productId);
    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { doc, deleteDoc } = await fs();
        await deleteDoc(doc(db, 'products', productId));
      } catch (e) {
        console.warn('[PRODUCTS] Delete error:', e);
        throw e;
      }
    }
    window.dispatchEvent(new CustomEvent('productsUpdated', { detail: _productsCache }));
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  T7 SHOP BOOKING REQUESTS
  // ══════════════════════════════════════════════════════════════════════
  async getBookingRequests(forceRefresh = false) {
    if (this._bookingCache && !forceRefresh) return this._bookingCache;
    const { db, isDemo } = svc();
    if (isDemo || !db) return (this._bookingCache = this._bookingCache || []);
    try {
      const { collection, getDocs, query, orderBy } = await fs();
      const snap = await getDocs(query(collection(db, 'bookingRequests'), orderBy('createdAt', 'desc')));
      this._bookingCache = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    } catch (e) {
      console.warn('[BOOKINGS] Fetch error:', e);
      this._bookingCache = this._bookingCache || [];
    }
    return this._bookingCache;
  },

  async saveBookingRequest(data) {
    const request = { id:data.id || 'BK-' + Date.now(), createdAt:data.createdAt || new Date().toISOString(), status:data.status || 'New', ...data };
    const list = await this.getBookingRequests();
    const idx = list.findIndex(x => x.id === request.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...request }; else list.unshift(request);
    this._bookingCache = list;
    const { db, isDemo } = svc();
    if (!isDemo && db) {
      const { doc, setDoc } = await fs();
      await setDoc(doc(db, 'bookingRequests', request.id), request, { merge:true });
    }
    return request;
  },

  async updateBookingStatus(id, status) {
    const list = await this.getBookingRequests();
    const item = list.find(x => x.id === id);
    if (!item) return null;
    return this.saveBookingRequest({ ...item, status, updatedAt:new Date().toISOString() });
  },

  // ══════════════════════════════════════════════════════════════════════
  //  SERVICE CATALOG — MySQL API backed, memory cached
  //  Firebase remains available for the rest of the application.
  // ══════════════════════════════════════════════════════════════════════

  getServicesCatalogSync() {
    return _catalogCache || DEFAULT_SERVICES.map(s => normalizeServicePricing({ category: 'General Printing', status: 'Active', ...s }));
  },

  async getServicesCatalog() {
    if (_catalogCache) return _catalogCache;

    try {
      const data = await sqlServicesRequest();
      const rows = Array.isArray(data) ? data : (Array.isArray(data?.services) ? data.services : []);
      _catalogCache = rows.map(normalizeSqlService);
      window.dispatchEvent(new CustomEvent('catalogUpdated', { detail: _catalogCache }));
      return _catalogCache;
    } catch (e) {
      console.warn('[SERVICES] MySQL API fetch error:', e);
    }

    // Safe UI fallback if the SQL API is temporarily unavailable.
    _catalogCache = DEFAULT_SERVICES.map(s => normalizeServicePricing({ category: 'General Printing', status: 'Active', ...s }));
    return _catalogCache;
  },

  async saveCatalogItem(serviceData) {
    const payload = serviceToSqlPayload(serviceData);
    const isUpdate = !!payload.id;
    const data = await sqlServicesRequest(isUpdate ? `/${encodeURIComponent(payload.id)}` : '', {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    const row = data?.service || data?.data || data?.item || data;
    const saved = normalizeSqlService(row);
    const catalog = await this.getServicesCatalog();
    const idx = catalog.findIndex(s => s.id === saved.id);
    if (idx >= 0) catalog[idx] = saved;
    else catalog.unshift(saved);
    _catalogCache = catalog;
    window.dispatchEvent(new CustomEvent('catalogUpdated', { detail: _catalogCache }));
    return saved;
  },

  async deleteCatalogItem(serviceId) {
    if (!serviceId) throw new Error('Service ID is required');
    await sqlServicesRequest(`/${encodeURIComponent(serviceId)}`, { method: 'DELETE' });
    if (_catalogCache) _catalogCache = _catalogCache.filter(s => s.id !== serviceId);
    window.dispatchEvent(new CustomEvent('catalogUpdated', { detail: _catalogCache || [] }));
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════
  //  ABOUT PAGE SETTINGS — Firestore backed (`aboutPage/general`), memory cached
  // ══════════════════════════════════════════════════════════════════════

  getAboutPageSync() {
    return _aboutCache || DEFAULT_ABOUT_PAGE;
  },

  async getAboutPage(forceRefresh = false) {
    if (_aboutCache && !forceRefresh) return _aboutCache;

    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { doc, getDoc } = await fs();
        const docRef = doc(db, 'aboutPage', 'general');
        const snap = await getDoc(docRef).catch(() => null);

        if (snap && snap.exists()) {
          const data = snap.data();
          _aboutCache = {
            ...DEFAULT_ABOUT_PAGE,
            ...data,
            creator: { ...DEFAULT_ABOUT_PAGE.creator, ...(data.creator || {}) },
            contact: { ...DEFAULT_ABOUT_PAGE.contact, ...(data.contact || {}) },
            socialLinks: { ...DEFAULT_ABOUT_PAGE.socialLinks, ...(data.socialLinks || {}) },
            services: Array.isArray(data.services) && data.services.length > 0 ? data.services : DEFAULT_ABOUT_PAGE.services,
            steps: Array.isArray(data.steps) && data.steps.length > 0 ? data.steps : DEFAULT_ABOUT_PAGE.steps
          };
          return _aboutCache;
        }
      } catch (e) {
        console.warn('[ABOUT] Firestore fetch error:', e);
      }
    }

    _aboutCache = JSON.parse(JSON.stringify(DEFAULT_ABOUT_PAGE));
    return _aboutCache;
  },

  async saveAboutPage(aboutData) {
    const merged = {
      ...DEFAULT_ABOUT_PAGE,
      ..._aboutCache,
      ...aboutData,
      creator: { ...DEFAULT_ABOUT_PAGE.creator, ...(_aboutCache?.creator || {}), ...(aboutData.creator || {}) },
      contact: { ...DEFAULT_ABOUT_PAGE.contact, ...(_aboutCache?.contact || {}), ...(aboutData.contact || {}) },
      socialLinks: { ...DEFAULT_ABOUT_PAGE.socialLinks, ...(_aboutCache?.socialLinks || {}), ...(aboutData.socialLinks || {}) },
      services: Array.isArray(aboutData.services) ? aboutData.services : (_aboutCache?.services || DEFAULT_ABOUT_PAGE.services),
      steps: Array.isArray(aboutData.steps) ? aboutData.steps : (_aboutCache?.steps || DEFAULT_ABOUT_PAGE.steps)
    };

    _aboutCache = merged;

    const { db, isDemo } = svc();
    if (!isDemo && db) {
      try {
        const { doc, setDoc } = await fs();
        await setDoc(doc(db, 'aboutPage', 'general'), merged, { merge: true });
        console.log('[ABOUT] Saved to Firestore:', merged);
      } catch (e) {
        console.warn('[ABOUT] Save error:', e);
        throw e;
      }
    }

    window.dispatchEvent(new CustomEvent('aboutPageUpdated', { detail: _aboutCache }));
    return _aboutCache;
  }
};

