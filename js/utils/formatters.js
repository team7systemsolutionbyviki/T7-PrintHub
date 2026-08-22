/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - FORMATTERS & HELPERS
   ========================================================================== */

export function normalizePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

export function formatCurrency(amount) {
  const num = normalizePrice(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatTime(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function getStatusBadgeHTML(status) {
  let badgeClass = 'badge-pending';
  if (status === 'Waiting Verification') badgeClass = 'badge-waiting';
  else if (status === 'Payment Approved') badgeClass = 'badge-approved';
  else if (status === 'Printing') badgeClass = 'badge-printing';
  else if (status === 'Quality Check') badgeClass = 'badge-printing';
  else if (status === 'Ready for Pickup') badgeClass = 'badge-ready';
  else if (status === 'Completed') badgeClass = 'badge-completed';
  else if (status === 'Rejected' || status === 'Cancelled') badgeClass = 'badge-rejected';

  return `<span class="badge ${badgeClass}">${status}</span>`;
}

export function sanitizeUTR(utr) {
  return String(utr).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
