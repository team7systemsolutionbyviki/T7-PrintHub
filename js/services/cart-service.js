/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - SHOPPING CART SERVICE
   ========================================================================== */

const CART_KEY = 'team7_shop_cart';

export const CartService = {
  getItems() {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('[CartService] Read error:', e);
      return [];
    }
  },

  saveItems(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: items }));
    } catch (e) {
      console.warn('[CartService] Save error:', e);
    }
  },

  addItem(product, qty = 1) {
    if (!product || !product.id) return;
    const items = this.getItems();
    const existingIndex = items.findIndex(item => item.productId === product.id || item.id === product.id);

    const price = Number(product.price) || 0;
    const addQty = Math.max(1, Number(qty) || 1);

    if (existingIndex !== -1) {
      const currentQty = items[existingIndex].quantity || 1;
      const maxStock = Number(product.stock) || 99;
      items[existingIndex].quantity = Math.min(currentQty + addQty, maxStock);
    } else {
      items.push({
        productId: product.id,
        id: product.id,
        name: product.name || 'Product',
        sku: product.sku || product.id,
        price: price,
        mrp: Number(product.mrp) || price,
        icon: product.icon || '📦',
        image: product.image || '',
        category: product.category || 'General',
        quantity: Math.min(addQty, Number(product.stock) || 99),
        stock: Number(product.stock) || 99
      });
    }

    this.saveItems(items);
    return items;
  },

  updateQuantity(productId, quantity) {
    let items = this.getItems();
    const target = items.find(item => item.productId === productId || item.id === productId);
    if (!target) return items;

    const newQty = Number(quantity);
    if (newQty <= 0) {
      return this.removeItem(productId);
    }

    const maxStock = Number(target.stock) || 99;
    target.quantity = Math.min(newQty, maxStock);
    this.saveItems(items);
    return items;
  },

  removeItem(productId) {
    let items = this.getItems();
    items = items.filter(item => item.productId !== productId && item.id !== productId);
    this.saveItems(items);
    return items;
  },

  clearCart() {
    this.saveItems([]);
  },

  getItemCount() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  },

  getSubtotal() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
  },

  calculateTotals(shopSettings = {}) {
    const subtotal = this.getSubtotal();
    const threshold = Number(shopSettings.freeDeliveryThreshold) || 999;
    const baseDelivery = Number(shopSettings.localDeliveryFee) || 50;

    let deliveryFee = 0;
    if (subtotal > 0) {
      deliveryFee = subtotal >= threshold ? 0 : baseDelivery;
    }

    const grandTotal = subtotal + deliveryFee;

    return {
      subtotal,
      deliveryFee,
      freeDeliveryThreshold: threshold,
      isFreeDelivery: subtotal >= threshold && subtotal > 0,
      amountNeededForFreeDelivery: Math.max(0, threshold - subtotal),
      grandTotal
    };
  }
};
