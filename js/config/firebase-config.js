/* ==========================================================================
   TEAM 7 SYSTEM SOLUTION - FIREBASE CONFIGURATION (AUTHENTICATION ONLY)
   ========================================================================== */

// Firebase Live Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBXhlnkaJwEzREjdLlMfATsH2JVtOlG_2M",
  authDomain: "printing-app-9a63f.firebaseapp.com",
  projectId: "printing-app-9a63f",
  messagingSenderId: "10036391737",
  appId: "1:10036391737:web:ef9686abd9655defbf82e8"
};

// Check if Firebase keys are set to real values
export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && firebaseConfig.apiKey !== "";

let firebaseApp = null;
let auth        = null;
let _initPromise = null;  // Singleton promise — prevents double-init

// Initialize Firebase — AUTHENTICATION ONLY
export async function initFirebase() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. This application requires Firebase Authentication.');
    }

    try {
      const [
        { initializeApp },
        { getAuth }
      ] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')
      ]);

      firebaseApp = initializeApp(firebaseConfig);
      auth        = getAuth(firebaseApp);

      console.log('⚡ Firebase Auth initialized.');
      return { firebaseApp, auth, mode: 'FIREBASE' };
    } catch (err) {
      console.error('Firebase initialization failed:', err);
      throw new Error(`Firebase initialization failed: ${err?.message || 'Unknown error'}`);
    }
  })();

  return _initPromise;
}

export function getServices() {
  return { auth, firebaseApp, isDemo: false };
}

