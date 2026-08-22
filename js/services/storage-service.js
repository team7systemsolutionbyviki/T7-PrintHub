/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - STORAGE SERVICE (HOSTINGER VPS STORAGE)
   Hostinger VPS Filesystem Storage via Express Node.js API Backend.
   Zero Google Drive or Firebase Storage dependency.
   ========================================================================== */

import { getServices } from '../config/firebase-config.js';

function getApiBaseUrl() {
  return '/api/storage';
}

/**
 * Get current authenticated user's Firebase Auth ID Token
 */
async function getAuthToken() {
  const { auth } = getServices();
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (e) {
      console.warn("Failed to get Firebase Auth ID token:", e);
    }
  }
  return null;
}

export const StorageService = {
  // File Validation: PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS, XLSX (Max 100MB)
  validateFile(file) {
    if (!file) return { valid: false, error: 'No file selected.' };
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return { valid: false, error: `File "${file.name}" exceeds maximum allowed size of 100MB (${this.formatBytes(file.size)}).` };
    }

    const fileName = file.name ? file.name.toLowerCase() : '';
    const rejectedExts = ['.exe', '.bat', '.cmd', '.js', '.vbs', '.ps1', '.scr', '.sh', '.jar', '.apk', '.com', '.pif', '.msi'];
    if (rejectedExts.some(ext => fileName.endsWith(ext))) {
      return { valid: false, error: `Executable file "${file.name}" is strictly prohibited for security.` };
    }

    const allowedExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasValidExt = allowedExts.some(ext => fileName.endsWith(ext));

    const allowedMIMEs = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    const hasValidMIME = !file.type || allowedMIMEs.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

    if (!hasValidExt && !hasValidMIME) {
      return { valid: false, error: `File "${file.name}" has an unsupported format. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, WEBP.` };
    }

    return { valid: true };
  },

  // Upload file to Hostinger VPS Storage via Node.js API
  async uploadFileResumable(file, categoryOrFolder = 'other', onProgress = null, bookingId = '', serviceId = '') {
    const val = this.validateFile(file);
    if (!val.valid) throw new Error(val.error);

    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please sign in to upload files.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', categoryOrFolder || 'other');
    formData.append('bookingId', bookingId || '');
    formData.append('serviceId', serviceId || '');

    const apiUrl = '/api/uploads/upload.php';

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', apiUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (xhr.upload && typeof onProgress === 'function') {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            const f = result.data || result.file;
            if (result.success && f) {
              resolve({
                fileId: f.id || f.fileId,
                id: f.id || f.fileId,
                originalName: f.originalName || file.name,
                fileName: f.originalName || file.name,
                name: f.originalName || file.name,
                mimeType: f.mimeType || file.type || 'application/octet-stream',
                type: f.mimeType || file.type || 'application/octet-stream',
                fileSize: this.formatBytes(file.size),
                size: this.formatBytes(file.size),
                rawSize: file.size,
                downloadURL: `/api/uploads/download.php?id=${f.id}`,
                url: `/api/uploads/download.php?id=${f.id}`,
                uploadStatus: 'UPLOADED',
                status: 'UPLOADED',
                uploadedAt: f.createdAt || new Date().toISOString()
              });
            } else {
              reject(new Error(result.message || 'Upload failed. Server returned invalid response.'));
            }
          } catch (err) {
            reject(new Error('Upload response parsing failed.'));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.message || errRes.error || `Server upload error (HTTP ${xhr.status})`));
          } catch {
            reject(new Error(`Server error HTTP ${xhr.status} while uploading file.`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during file upload. Please check your internet connection.'));
      xhr.ontimeout = () => reject(new Error('File upload timed out. Please try again.'));

      xhr.send(formData);
    });
  },

  // Upload Product Image (for Admin catalog)
  async uploadProductImage(file, productId = 'temp-product', onProgress = null) {
    return this.uploadFileResumable(file, 'other', onProgress, productId, 'product-image');
  },

  // Universal upload method
  async uploadFile(file, categoryOrFolder = 'other', onProgress = null) {
    return this.uploadFileResumable(file, categoryOrFolder, onProgress);
  },

  // Get secure authorized URL for file preview or download
  async getFileUrl(fileObj) {
    if (!fileObj) return '';
    let target = fileObj;
    if (typeof fileObj === 'string') {
      if (fileObj.startsWith('http://') || fileObj.startsWith('https://')) return fileObj;
      target = { fileId: fileObj };
    }

    const fileId = target.fileId || target.id;
    if (fileId) {
      return `/api/uploads/download.php?id=${fileId}`;
    }

    if (target.url && (target.url.startsWith('http://') || target.url.startsWith('https://') || target.url.startsWith('/api/'))) {
      return target.url;
    }
    if (target.downloadURL && (target.downloadURL.startsWith('http://') || target.downloadURL.startsWith('https://') || target.downloadURL.startsWith('/api/'))) {
      return target.downloadURL;
    }

    return '';
  },

  // Read file as Data URL (Base64 string helper)
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  },

  // Helper format bytes
  formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
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

