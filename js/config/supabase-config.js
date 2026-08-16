/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - SUPABASE CONFIGURATION
   ========================================================================== */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Live Configuration (Project ID: yosochxgdfyuhzewefiz)
export const SUPABASE_PROJECT_ID = "yosochxgdfyuhzewefiz";
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

// Publishable / Anonymous Key for client-side storage access
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc29jaHhnZGZ5dWh6ZXdlZml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkwMDAwMDAsImV4cCI6MjAyNTAwMDAwMH0.placeholder";

export const SUPABASE_BUCKETS = {
  DOCUMENTS: 't7-documents',
  PAYMENT_PROOFS: 't7-payment-proofs',
  PRODUCTS: 't7-products',
  ABOUT: 't7-about'
};

let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false
      }
    });
  }
  return supabaseClient;
}

// Auto-provision storage buckets if they do not exist
export async function ensureBucketsExist() {
  const client = getSupabase();
  if (!client) return;

  const buckets = [
    { name: SUPABASE_BUCKETS.DOCUMENTS, isPublic: true },
    { name: SUPABASE_BUCKETS.PAYMENT_PROOFS, isPublic: true },
    { name: SUPABASE_BUCKETS.PRODUCTS, isPublic: true },
    { name: SUPABASE_BUCKETS.ABOUT, isPublic: true }
  ];

  for (const b of buckets) {
    try {
      const { data: existing } = await client.storage.getBucket(b.name);
      if (!existing) {
        await client.storage.createBucket(b.name, { public: b.isPublic });
        console.log(`[SUPABASE] Bucket created: ${b.name}`);
      }
    } catch (err) {
      // Bucket check/create warning (ignored if already present or restricted)
    }
  }
}
