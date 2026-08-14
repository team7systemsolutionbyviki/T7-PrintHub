/* ==========================================================================
   T7PRINTHUB - AWB DISPATCH / WHATSAPP CLICK-TO-CHAT
   No WhatsApp API key required.
   Opens WhatsApp with a pre-filled customer message.
   ========================================================================== */

export const AWBDispatchService = {
  async uploadAWBSlip(file, orderId) {
    if (!file) throw new Error('AWB slip file is required.');
    if (!orderId) throw new Error('Order ID is required.');

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      throw new Error('Allowed AWB files: JPG, PNG, WEBP or PDF.');
    }
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('AWB slip must be 15 MB or smaller.');
    }

    const { storage, isDemo } = getServices();
    if (isDemo || !storage) {
      throw new Error('Firebase Storage is not available. Connect Firebase before uploading an AWB slip.');
    }

    const mod = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');
    const { ref, uploadBytes, getDownloadURL } = mod;
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `awb-slips/${orderId}/${Date.now()}-${clean}`;
    const fileRef = ref(storage, path);

    await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        orderId: String(orderId),
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });

    return {
      url: await getDownloadURL(fileRef),
      storagePath: path,
      fileName: file.name,
      mimeType: file.type,
      size: file.size
    };
  },

  buildWhatsAppLink({ customerPhone, customerName, orderId, courierName, awbNumber, invoiceUrl, trackingUrl }) {
    const raw = String(customerPhone || '').replace(/\D/g, '');
    if (!raw) throw new Error('Customer WhatsApp number is missing.');

    // For Indian 10-digit mobile numbers, add country code.
    const phone = raw.length === 10 ? `91${raw}` : raw;

    const message =
`Hello ${customerName || 'Customer'} 👋

Your T7PrintHub order #${orderId} has been dispatched. 📦

🚚 Courier: ${courierName || 'ST Courier'}
🔢 AWB Number: ${awbNumber}

🧾 Invoice:
${invoiceUrl}

🔗 Track your shipment:
${trackingUrl || 'https://www.stcourier.com/track/shipment'}

Thank you for choosing T7PrintHub.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
};

if (typeof window !== 'undefined') {
  window.AWBDispatchService = AWBDispatchService;
}
