/* ==========================================================================
   T7 PRINT HUB — FIREBASE ADMIN SDK INITIALIZATION (AUTHENTICATION ONLY)
   ========================================================================== */

const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

function initFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'printing-app-9a63f';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      console.log('⚡ Firebase Admin SDK initialized with service account.');
    } else {
      // Fallback for default environment / ADC if available
      admin.initializeApp({
        projectId
      });
      console.log('⚡ Firebase Admin SDK initialized with default project ID.');
    }
  } catch (err) {
    console.error('Firebase Admin init error:', err.message);
  }

  return admin.app();
}

module.exports = {
  admin,
  initFirebaseAdmin
};
