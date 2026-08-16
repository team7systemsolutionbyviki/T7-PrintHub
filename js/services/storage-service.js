/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - STORAGE SERVICE (SUPABASE STORAGE + INDEXEDDB ENGINE)
   ========================================================================== */

import { getSupabase, SUPABASE_BUCKETS, ensureBucketsExist } from '../config/supabase-config.js';

let dbPromise = null;
const blobUrlCache = new Map();

// Initialize IndexedDB instance for zero-latency local binary file fallback
function getIDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open('Team7StorageDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files');
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (err) => {
        console.warn("IndexedDB open error:", err);
        resolve(null);
      };
    } catch (e) {
      console.warn("IndexedDB initialization error:", e);
      resolve(null);
    }
  });
  return dbPromise;
}

export const StorageService = {
  // Initialize storage buckets
  async initStorage() {
    await ensureBucketsExist();
  },

  // Save raw binary File/Blob into IndexedDB
  async saveToIDB(idbKey, fileOrBlob) {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.put(fileOrBlob, idbKey);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        console.warn("IDB save error:", e);
        resolve(false);
      }
    });
  },

  // Get raw binary File/Blob from IndexedDB by idbKey
  async getFromIDB(idbKey) {
    if (!idbKey) return null;
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.get(idbKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        console.warn("IDB fetch error:", e);
        resolve(null);
      }
    });
  },

  // Delete raw binary File/Blob from IndexedDB
  async deleteFromIDB(idbKey) {
    if (!idbKey) return false;
    const db = await getIDB();
    if (!db) return false;
    if (blobUrlCache.has(idbKey)) {
      try {
        URL.revokeObjectURL(blobUrlCache.get(idbKey));
      } catch (e) {}
      blobUrlCache.delete(idbKey);
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const req = store.delete(idbKey);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (e) {
        console.warn("IDB delete error:", e);
        resolve(false);
      }
    });
  },

  // Auto-delete PDF document binary files for an order from local IDB
  async deleteOrderFiles(order) {
    if (!order) return;
    const filesList = order.files && order.files.length > 0 ? order.files : (order.file ? [order.file] : []);
    for (const f of filesList) {
      const idbKey = f.idbKey || (f.url && f.url.startsWith('idb://') ? f.url.replace('idb://', '') : null);
      if (idbKey) {
        await this.deleteFromIDB(idbKey);
      }
    }
  },

  // Get Blob object from file record
  async getFileBlob(fileObj) {
    if (!fileObj) return null;
    if (fileObj.idbKey) {
      const blob = await this.getFromIDB(fileObj.idbKey);
      if (blob) return blob;
    }
    const url = fileObj.url || (typeof fileObj === 'string' ? fileObj : '');
    if (url.startsWith('idb://')) {
      const key = url.replace('idb://', '');
      const blob = await this.getFromIDB(key);
      if (blob) return blob;
    }
    if (url.startsWith('data:')) {
      try {
        const arr = url.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      } catch (e) {
        console.warn("Base64 to blob conversion failed:", e);
      }
    }
    return null;
  },

  // Get usable browser URL from Supabase Storage / HTTPS / IndexedDB
  async getFileUrl(fileObj) {
    if (!fileObj) return '';
    let target = fileObj;
    if (typeof fileObj === 'string') {
      target = { url: fileObj };
    }

    const url = target.url || target.downloadURL || target.publicUrl || target.screenshotUrl || '';
    const dataUrl = target.dataUrl || target.screenshotDataUrl || target.fallbackData || '';
    const idbKey = target.idbKey || target.screenshotIdbKey || (url.startsWith('idb://') ? url.replace('idb://', '') : '');
    const storagePath = target.storagePath || target.imagePath || '';
    const bucket = target.bucket || target.imageBucket || SUPABASE_BUCKETS.DOCUMENTS;

    // 1. Direct Web HTTPS, HTTP, Blob, or Data URLs
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }
    if (url.startsWith('data:') && url.length > 500) {
      return url;
    }
    if (dataUrl && (dataUrl.startsWith('http://') || dataUrl.startsWith('https://') || (dataUrl.startsWith('data:') && dataUrl.length > 500))) {
      return dataUrl;
    }

    // 2. Fetch live public / signed URL from Supabase Storage
    if (storagePath) {
      try {
        const supabase = getSupabase();
        const cleanPath = storagePath.replace(new RegExp(`^${bucket}\/`), '');
        const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
        if (data?.publicUrl) return data.publicUrl;
      } catch (e) {
        console.warn("[SUPABASE] Get file URL warning:", e);
      }
    }

    // 3. In-memory blob cache
    if (idbKey && blobUrlCache.has(idbKey)) {
      return blobUrlCache.get(idbKey);
    }

    // 4. Local IndexedDB (Same device)
    if (idbKey) {
      const blob = await this.getFromIDB(idbKey);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        blobUrlCache.set(idbKey, blobUrl);
        return blobUrl;
      }
    }

    return '';
  },

  // Get temporary signed URL for private Supabase Storage files
  async getSignedUrl(bucketName, filePath, expiresIn = 3600) {
    if (!filePath) return '';
    try {
      const supabase = getSupabase();
      const cleanPath = filePath.replace(new RegExp(`^${bucketName}\/`), '');
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(cleanPath, expiresIn);

      if (error) throw error;
      return data?.signedUrl || '';
    } catch (e) {
      console.warn(`[SUPABASE] Failed to create signed URL for ${bucketName}/${filePath}:`, e.message || e);
      // Fallback to public URL
      const supabase = getSupabase();
      const cleanPath = filePath.replace(new RegExp(`^${bucketName}\/`), '');
      const { data } = supabase.storage.from(bucketName).getPublicUrl(cleanPath);
      return data?.publicUrl || '';
    }
  },

  // Read file as Data URL (Base64 string)
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  // File Validation: Type (PDF, DOC, DOCX, JPG, PNG, WEBP) & Size (Max 50MB for PDFs)
  validateFile(file) {
    if (!file) return { valid: false, error: 'No file selected.' };
    const maxSize = 50 * 1024 * 1024; // 50MB for PDF documents
    if (file.size > maxSize) {
      return { valid: false, error: `File "${file.name}" exceeds maximum allowed size of 50MB (${this.formatBytes(file.size)}).` };
    }

    const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileName = file.name ? file.name.toLowerCase() : '';
    const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));

    const allowedMIMEs = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    const hasValidMIME = !file.type || allowedMIMEs.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

    if (!hasValidExt && !hasValidMIME) {
      return { valid: false, error: `File "${file.name}" has an unsupported format. Allowed formats: PDF, DOC, DOCX, JPG, PNG, WEBP.` };
    }

    return { valid: true };
  },

  // Client-Side Image Compression Engine
  async compressImage(file, maxWidth = 1600, quality = 0.80) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No image provided for compression.'));
      const originalSize = file.size;

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file for compression.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file format.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas image compression failed.'));
            resolve({
              blob,
              originalSize,
              compressedSize: blob.size,
              mimeType,
              width,
              height
            });
          }, mimeType, quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // PDF Document Upload to Supabase Storage (bucket: t7-documents)
  async uploadFileResumable(file, orderId = 'temp', onProgress = null) {
    const val = this.validateFile(file);
    if (!val.valid) {
      throw new Error(val.error);
    }

    const idbKey = 'idb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const uploadedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

    // Store in local IndexedDB for immediate local access
    await this.saveToIDB(idbKey, file);

    const safeId = String(orderId || 'temp').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanFileName = String(file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${safeId}/${Date.now()}_${cleanFileName}`;
    const bucket = SUPABASE_BUCKETS.DOCUMENTS;

    console.log(`[SUPABASE STORAGE] Uploading PDF document to bucket "${bucket}" path:`, filePath);

    let downloadUrl = '';
    let storagePath = `${bucket}/${filePath}`;
    let dataUrl = '';

    if (file.size <= 15 * 1024 * 1024) {
      try {
        dataUrl = await this.readFileAsDataURL(file);
      } catch (e) {}
    }

    try {
      const supabase = getSupabase();
      if (typeof onProgress === 'function') onProgress(10, 'UPLOADING');

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/pdf'
        });

      if (error) {
        console.warn(`[SUPABASE STORAGE WARNING] Upload error for ${filePath}:`, error.message);
        throw error;
      }

      if (typeof onProgress === 'function') onProgress(90, 'GENERATING_URL');

      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      downloadUrl = pubData?.publicUrl || '';

      if (typeof onProgress === 'function') onProgress(100, 'SUCCESS');
      console.log('✅ PDF successfully uploaded to Supabase Storage:', filePath);
    } catch (err) {
      console.warn('[SUPABASE STORAGE] PDF upload fallback to local IDB:', err?.message || err);
      downloadUrl = dataUrl || ('idb://' + idbKey);
      if (typeof onProgress === 'function') onProgress(100, 'SUCCESS');
    }

    return {
      storageProvider: 'supabase',
      bucket: bucket,
      storagePath: storagePath,
      uploadStatus: 'uploaded',
      downloadURL: downloadUrl,
      url: downloadUrl,
      dataUrl: dataUrl,
      idbKey: idbKey,
      fileName: file.name,
      name: file.name,
      fileType: file.type || 'application/pdf',
      type: file.type || 'application/pdf',
      fileSize: this.formatBytes(file.size),
      size: this.formatBytes(file.size),
      rawSize: file.size,
      mimeType: file.type || 'application/pdf',
      uploadedAt: uploadedAt,
      expiresAt: expiresAt
    };
  },

  // Universal upload wrapper
  async uploadFile(file, pathFolder = 'uploads', onProgress = null) {
    const val = this.validateFile(file);
    if (!val.valid) {
      throw new Error(val.error);
    }
    return this.uploadFileResumable(file, pathFolder.replace(/[^a-zA-Z0-9_-]/g, '_'), onProgress);
  },

  // Payment Screenshot Upload to Supabase Storage (bucket: t7-payment-proofs)
  async uploadPaymentProof(file, orderId = 'temp', onProgress = null) {
    if (!file) throw new Error('Please select a payment proof image.');
    const type = String(file.type || '').toLowerCase();
    if (!type.startsWith('image/') || !/\.(jpg|jpeg|png|webp)$/i.test(file.name || '')) {
      throw new Error('Only JPG, JPEG, PNG, and WEBP payment proof images are allowed.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Payment screenshot size must be 5MB or smaller.');
    }

    console.log('[SUPABASE STORAGE] Uploading payment screenshot for order:', orderId);

    // 1. Compress Image to ~300-500 KB (Max Width: 1600px, Quality: 0.80)
    const comp = await this.compressImage(file, 1600, 0.80);
    const cleanName = String(file.name || 'screenshot.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeId = String(orderId || 'temp').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${safeId}/${Date.now()}_${cleanName}`;
    const bucket = SUPABASE_BUCKETS.PAYMENT_PROOFS;
    const storagePath = `${bucket}/${filePath}`;

    console.log('[SUPABASE STORAGE] Image compressed:', comp.originalSize, 'bytes →', comp.compressedSize, 'bytes');

    try {
      const supabase = getSupabase();
      if (typeof onProgress === 'function') onProgress(30, 'UPLOADING');

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, comp.blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: comp.mimeType
        });

      if (error) {
        console.error('[SUPABASE STORAGE ERROR] Payment screenshot upload failed:', error);
        throw new Error(`Payment screenshot upload failed: ${error.message}`);
      }

      if (typeof onProgress === 'function') onProgress(90, 'SUCCESS');

      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const downloadURL = pubData?.publicUrl || '';

      console.log('✅ Payment screenshot uploaded to Supabase Storage:', downloadURL);

      return {
        storageProvider: 'supabase',
        bucket: bucket,
        storagePath: storagePath,
        uploaded: true,
        downloadURL: downloadURL,
        url: downloadURL,
        fileName: file.name,
        fileSize: comp.compressedSize,
        originalSize: comp.originalSize,
        mimeType: comp.mimeType,
        uploadedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('[SUPABASE STORAGE ERROR] Payment proof upload error:', err);
      throw new Error('Payment screenshot upload failed. Please try again.');
    }
  },

  // Permanent product / accessory image upload to Supabase Storage (bucket: t7-products)
  async uploadCatalogImage(file, catalogType = 'products', itemId = 'new') {
    if (!file) throw new Error('Please select an image.');
    const type = String(file.type || '').toLowerCase();
    if (!type.startsWith('image/') || !/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name || '')) {
      throw new Error('Only JPG, PNG, GIF and WEBP images are allowed.');
    }
    if (file.size > 10 * 1024 * 1024) throw new Error('Image must be 10MB or smaller.');

    const idbKey = 'catalog_image_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    await this.saveToIDB(idbKey, file);

    const safeType = String(catalogType).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeId = String(itemId || 'new').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanName = String(file.name || 'image.webp').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${safeType}/${safeId}/${Date.now()}_${cleanName}`;
    const bucket = SUPABASE_BUCKETS.PRODUCTS;
    const storagePath = `${bucket}/${filePath}`;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || 'image/webp'
        });

      if (error) {
        console.warn('[SUPABASE STORAGE] Product image upload warning:', error.message);
        throw error;
      }

      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const url = pubData?.publicUrl || '';

      console.log('✅ Product image uploaded to Supabase Storage:', url);
      return {
        imageProvider: 'supabase',
        imageBucket: bucket,
        imagePath: storagePath,
        url,
        imageUrl: url,
        downloadURL: url,
        name: file.name,
        idbKey
      };
    } catch (e) {
      console.warn('[SUPABASE STORAGE] Product image upload fallback:', e);
      const dataUrl = await this.readFileAsDataURL(file);
      return {
        imageProvider: 'local',
        imageBucket: bucket,
        imagePath: '',
        url: dataUrl,
        imageUrl: dataUrl,
        downloadURL: dataUrl,
        name: file.name,
        idbKey
      };
    }
  },

  // Permanent creator image upload to Supabase Storage (bucket: t7-about)
  async uploadCreatorImage(file) {
    if (!file) throw new Error('Please select an image file.');
    const type = String(file.type || '').toLowerCase();
    if (!type.startsWith('image/') || !/\.(jpg|jpeg|png|webp)$/i.test(file.name || '')) {
      throw new Error('Only JPG, JPEG, PNG, and WEBP image files are allowed.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image file size must be 10MB or smaller.');
    }

    const idbKey = 'creator_image_' + Date.now();
    await this.saveToIDB(idbKey, file);

    const cleanName = String(file.name || 'creator.webp').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${Date.now()}_${cleanName}`;
    const bucket = SUPABASE_BUCKETS.ABOUT;
    const storagePath = `${bucket}/${filePath}`;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || 'image/webp'
        });

      if (error) {
        console.warn('[SUPABASE STORAGE] Creator image upload error:', error.message);
        throw error;
      }

      const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const url = pubData?.publicUrl || '';

      console.log('✅ Creator image uploaded to Supabase Storage:', url);
      return {
        imageProvider: 'supabase',
        imageBucket: bucket,
        imagePath: storagePath,
        url,
        creatorImageUrl: url,
        downloadURL: url,
        name: file.name,
        idbKey
      };
    } catch (e) {
      console.warn('[SUPABASE STORAGE] Creator image upload fallback:', e);
      const dataUrl = await this.readFileAsDataURL(file);
      return {
        imageProvider: 'local',
        imageBucket: bucket,
        imagePath: '',
        url: dataUrl,
        creatorImageUrl: dataUrl,
        downloadURL: dataUrl,
        name: file.name,
        idbKey
      };
    }
  },

  // Delete a file from Supabase Storage by its bucket and storagePath
  async deleteFileByPath(storagePath, bucketName = SUPABASE_BUCKETS.DOCUMENTS) {
    if (!storagePath || storagePath === '') return false;
    try {
      const supabase = getSupabase();
      const cleanPath = storagePath.replace(new RegExp(`^${bucketName}\/`), '');
      const { data, error } = await supabase.storage.from(bucketName).remove([cleanPath]);
      if (error) throw error;
      console.log('🗑️ Supabase Storage file deleted:', storagePath);
      return true;
    } catch (err) {
      console.warn('Supabase storage delete warning:', storagePath, err);
      return false;
    }
  },

  // Auto-cleanup expired document files
  async cleanupExpiredFiles(orders, updateOrderCallback) {
    if (!orders || orders.length === 0) return;
    const now = Date.now();
    for (const order of orders) {
      if (!order.files) continue;
      let changed = false;
      for (const f of order.files) {
        if (f.uploadStatus === 'expired' || f.expired) continue;
        if (!f.expiresAt) continue;
        if (new Date(f.expiresAt).getTime() > now) continue;

        if (f.storagePath) {
          await this.deleteFileByPath(f.storagePath, f.bucket || SUPABASE_BUCKETS.DOCUMENTS);
        }

        f.uploadStatus = 'expired';
        f.expired = true;
        f.downloadURL = null;
        f.url = '';
        f.dataUrl = '';
        f.storagePath = null;
        changed = true;
      }

      if (changed && typeof updateOrderCallback === 'function') {
        await updateOrderCallback(order);
      }
    }
  },

  // Helper format bytes
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // Ultra-Fast PDF Page Count Estimator (< 5ms)
  async estimatePdfPages(file) {
    if (!file) return 1;
    const isPdf = file.name && file.name.toLowerCase().endsWith('.pdf');
    const fallbackEst = Math.max(1, Math.ceil(file.size / (120 * 1024)));
    if (!isPdf) return fallbackEst;

    return new Promise((resolve) => {
      let isResolved = false;
      const safeResolve = (pages) => {
        if (isResolved) return;
        isResolved = true;
        resolve(pages > 0 ? pages : fallbackEst);
      };

      const safetyTimer = setTimeout(() => {
        safeResolve(fallbackEst);
      }, 1500);

      const chunkSize = 128 * 1024;
      const headChunk = file.slice(0, chunkSize);
      const tailChunk = file.size > chunkSize ? file.slice(Math.max(0, file.size - chunkSize)) : null;

      let pagesFound = 0;
      let pendingReads = tailChunk ? 2 : 1;

      const checkFinish = () => {
        pendingReads--;
        if (pendingReads <= 0) {
          clearTimeout(safetyTimer);
          safeResolve(pagesFound);
        }
      };

      const processText = (text) => {
        if (!text) return;
        try {
          const countMatches = [...text.matchAll(/\/Count\s+(\d+)/g)];
          for (const match of countMatches) {
            const countVal = parseInt(match[1], 10);
            if (!isNaN(countVal) && countVal > pagesFound) {
              pagesFound = countVal;
            }
          }
          if (pagesFound === 0) {
            const pageMatches = text.match(/\/Type\s*\/Page\b/g);
            if (pageMatches && pageMatches.length > pagesFound) {
              pagesFound = pageMatches.length;
            }
          }
        } catch (err) {
          console.warn('PDF page parsing warning:', err);
        }
      };

      const readerHead = new FileReader();
      readerHead.onload = (e) => {
        try { processText(e.target.result); } catch (err) {}
        checkFinish();
      };
      readerHead.onerror = checkFinish;
      readerHead.readAsText(headChunk);

      if (tailChunk) {
        const readerTail = new FileReader();
        readerTail.onload = (e) => {
          try { processText(e.target.result); } catch (err) {}
          checkFinish();
        };
        readerTail.onerror = checkFinish;
        readerTail.readAsText(tailChunk);
      }
    });
  }
};
